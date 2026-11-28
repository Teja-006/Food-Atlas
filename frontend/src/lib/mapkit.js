// Google Maps replaces Leaflet/OpenStreetMap here. The API key is read from
// VITE_GOOGLE_MAPS_API_KEY (frontend/.env) and is never committed.

export const DEFAULT_CENTER = { lat: 17.42, lng: 78.45 };

export const ratingLabel = (r) => (r > 0 ? Number(r).toFixed(1) : "New");

export const directionsLink = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const mapsLink = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;