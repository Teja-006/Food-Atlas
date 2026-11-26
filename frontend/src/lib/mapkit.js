import L from "leaflet";
import "leaflet/dist/leaflet.css";

// OpenStreetMap's standard tiles. Free, no key. See the tile usage policy in the README.
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const DEFAULT_CENTER = [17.42, 78.45];

// A rating stamp used as the map pin. `label` is only ever a number or a fixed word.
export function stampIcon(label) {
  return L.divIcon({
    className: "pin-wrap",
    html: `<span class="stamp pin">${label}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
  });
}

export const ratingLabel = (r) => (r > 0 ? Number(r).toFixed(1) : "New");

// Plain links (no API key or billing involved).
export const osmLink = (lat, lng) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
export const directionsLink = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
