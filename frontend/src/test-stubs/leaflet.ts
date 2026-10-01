// Stub Leaflet untuk lingkungan test (jsdom). LocationPicker meng-import leaflet secara
// DINAMIS; test tak menjalankan peta sungguhan. Objek chainable (addTo mengembalikan diri
// sendiri) agar pemanggilan .on/.setLatLng pasca-addTo tak melempar.
type Chainable = Record<string, (...args: unknown[]) => unknown>;

function makeMarker(): Chainable {
  const m: Chainable = {
    addTo: () => m,
    on: () => m,
    setLatLng: () => m,
    getLatLng: () => ({ lat: 0, lng: 0 }),
  };
  return m;
}

function makeMap(): Chainable {
  const map: Chainable = {
    on: () => map,
    remove: () => map,
    setView: () => map,
  };
  return map;
}

const stub = {
  map: () => makeMap(),
  tileLayer: () => ({ addTo: () => makeMap() }),
  marker: () => makeMarker(),
  divIcon: () => ({}),
};

export default stub;
