import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "./Icon.tsx";
import { tNow, useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";
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

async function fetchIpLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch("https://ipwho.is/", { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; latitude?: number; longitude?: number };
    if (!body.success || body.latitude == null || body.longitude == null) return null;
    return { lat: body.latitude, lng: body.longitude };
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
  const [geoIssue, setGeoIssue] = useState<DictKey | null>(null);
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
      // Wajib: host tanpa subdomain {s} + atribusi terlihat + Referer terkirim (lihat Referrer-Policy di staticwebapp.config.json) — pelanggaran = 403 "Access Blocked" dari OSM.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
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

  function requestMyLocation(): void {
    if (!("geolocation" in navigator)) { setGeoIssue("shop.map.geoUnavailable"); setStatus("geo-error"); return; }
    setStatus("locating");
    setGeoIssue(null);
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
      (err) => {
        // 1=PERMISSION_DENIED: no fallback (user chose to block).
        if (err.code === 1) { setGeoIssue("shop.map.geoDenied"); setStatus("geo-error"); return; }
        // 2=POSITION_UNAVAILABLE, 3=TIMEOUT: try IP geolocation fallback.
        void fetchIpLocation().then((ip) => {
          if (ip !== null) {
            mapRef.current?.setView([ip.lat, ip.lng], 12);
            markerRef.current?.setLatLng([ip.lat, ip.lng]);
            setAccuracy(3000);
            setGeoIssue("shop.map.ipFallback");
            setStatus("idle");
            void reverseGeocode(ip.lat, ip.lng).then((addr) => onChange(ip, addr));
          } else {
            setGeoIssue(err.code === 3 ? "shop.map.geoTimeout" : "shop.map.geoUnavailable");
            setStatus("geo-error");
          }
        });
      },
      // Desktop tanpa GPS: akurasi tinggi bikin permintaan gagal; timeout 20s + cache 1m agar provider jaringan tidak mudah timeout.
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
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
      {status === "geo-error" ? <p className="cart-opt-note" role="alert"><Icon name="warning" /> {t(geoIssue ?? "shop.map.geoerror")}</p> : null}
      {status === "idle" && geoIssue === "shop.map.ipFallback" ? <p className="cart-opt-note"><Icon name="warning" /> {t("shop.map.ipFallback")}</p> : null}
      {showConsent ? (
        <div role="dialog" aria-label={t("shop.map.consent.title")} aria-modal="true" className="need-popup">
          <div className="need-popup-card">
            <h2>{t("shop.map.consent.title")}</h2>
            <p>{t("shop.map.consent.a")}</p>
            <p>{t("shop.map.consent.b")}</p>
            <div className="need-popup-actions">
              <button type="button" onClick={() => { setShowConsent(false); requestMyLocation(); }}>{t("shop.map.consent.agree")}</button>
              <button type="button" onClick={() => setShowConsent(false)}>{t("shop.map.consent.cancel")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
