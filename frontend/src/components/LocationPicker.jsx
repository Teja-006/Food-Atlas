import { useCallback } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { DEFAULT_CENTER } from "../lib/mapkit";

const containerStyle = { width: "100%", height: "100%" };
const LOADER_ID = "food-atlas-google-maps";

export default function LocationPicker({ lat, lng, onChange }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const has = lat !== "" && lng !== "";
  const center = has ? { lat: Number(lat), lng: Number(lng) } : DEFAULT_CENTER;

  const handleClick = useCallback(
    (e) => onChange(+e.latLng.lat().toFixed(6), +e.latLng.lng().toFixed(6)),
    [onChange]
  );

  if (loadError) {
    return <p className="error">Could not load the map. Check the Google Maps API key.</p>;
  }

  return (
    <div>
      <div className="picker">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={has ? 15 : 11}
            onClick={handleClick}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
          >
            {has && <Marker position={center} />}
          </GoogleMap>
        ) : (
          <p className="muted small" style={{ padding: 16 }}>Loading map…</p>
        )}
      </div>
      <p className="muted small">
        {has ? `Selected: ${lat}, ${lng}` : "Click the map to place the restaurant."}
      </p>
    </div>
  );
}