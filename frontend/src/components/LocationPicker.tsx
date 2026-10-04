import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "./Icon.tsx";
import { tNow, useT } from "../i18n/t.ts";
import { getLang } from "../i18n/store.ts";

const DEFAULT: [number, number] = [-6.2, 106.816667]; // Jakarta sebagai titik awal

export type LatLng = { lat: number; lng: number };

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=0`,
      { headers: { "Accept-Language": getLang() } },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { display_name?: string };
    return body.display_name ?? null;
  } catch {
    return null;
  }
}

export function LocationPicker({ value, onChange }: { value: LatLng | null; onChange: (v: LatLng, address: string | null) => void }) {
  const t = useT();
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "geo-error">("idle");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  // Init map sekali — Leaflet di-import DINAMIS (runtime browser) agar tidak dieval di jsdom (OOM).
  useEffect(() => {
    // Lewati di lingkungan test (jsdom tak punya layout; peta tak diuji) -> cegah kebocoran async.
    if (typeof import.meta.env !== "undefined" && import.meta.env.MODE === "test") return;
    let cancelled = false;
    void (async () => {
      if (mapEl.current === null || mapRef.current !== null) return;
      const L = (await import("leaflet")).default;
      if (cancelled || mapEl.current === null) return;
      const pin = L.divIcon({ className: "map-pin", html: '<span class="map-pin-dot"></span>', iconSize: [18, 18], iconAnchor: [9, 9] });
      const start = value ?? { lat: DEFAULT[0], lng: DEFAULT[1] };
      const map = L.map(mapEl.current, { center: [start.lat, start.lng], zoom: value ? 16 : 12, zoomControl: false });
      L.control.zoom({ zoomInTitle: tNow("shop.map.zoomIn"), zoomOutTitle: tNow("shop.map.zoomOut") }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
      const marker = L.marker([start.lat, start.lng], { icon: pin, draggable: true }).addTo(map);
      mapRef.current = map;
      markerRef.current = marker;
      const commit = (lat: number, lng: number): void => {
        marker.setLatLng([lat, lng]);
        void reverseGeocode(lat, lng).then((addr) => onChange({ lat, lng }, addr));
      };
      map.on("click", (e: LeafletMouseEvent) => commit(e.latlng.lat, e.latlng.lng));
      marker.on("dragend", () => { const p = marker.getLatLng(); commit(p.lat, p.lng); });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init sekali; onChange stabil dari pemanggil
  }, []);

  function useMyLocation(): void {
    if (!("geolocation" in navigator)) { setStatus("geo-error"); return; }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
        // Zoom menyesuaikan akurasi: makin presisi, makin dekat (16-18); kasar -> lebih jauh.
        const zoom = acc <= 50 ? 18 : acc <= 200 ? 16 : acc <= 1000 ? 14 : 12;
        mapRef.current?.setView([lat, lng], zoom);
        markerRef.current?.setLatLng([lat, lng]);
        setAccuracy(Math.round(acc));
        setStatus("idle");
        void reverseGeocode(lat, lng).then((addr) => onChange({ lat, lng }, addr));
      },
      () => setStatus("geo-error"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <div className="map-picker">
      <div className="map-picker-bar">
        <button type="button" className="btn-secondary map-locate" onClick={() => setShowConsent(true)} disabled={status === "locating"}>
          <Icon name="spark" /> {status === "locating" ? t("shop.map.locating") : t("shop.map.locate")}
        </button>
        {value !== null ? <small className="map-coord">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</small> : <small className="map-coord">{t("shop.map.tap")}</small>}
      </div>
      <div ref={mapEl} className="map-canvas" role="application" aria-label={t("shop.map.label")} />
      <p className="map-hint">
        {accuracy !== null
          ? (accuracy > 300
            ? t("shop.map.coarse", { meters: accuracy })
            : t("shop.map.accuracy", { meters: accuracy }))
          : t("shop.map.hint")}
      </p>
      {status === "geo-error" ? <p className="cart-opt-note" role="alert"><Icon name="warning" /> {t("shop.map.geoerror")}</p> : null}
      {showConsent ? (
        <div role="dialog" aria-label={t("shop.map.consent.title")} aria-modal="true" className="need-popup">
          <div className="need-popup-card">
            <h2>{t("shop.map.consent.title")}</h2>
            <p>{t("shop.map.consent.a")}</p>
            <p>{t("shop.map.consent.b")}</p>
            <div className="need-popup-actions">
              <button type="button" onClick={() => { setShowConsent(false); useMyLocation(); }}>{t("shop.map.consent.agree")}</button>
              <button type="button" onClick={() => setShowConsent(false)}>{t("shop.map.consent.cancel")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
