import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { DEFAULT_CENTER, TILE_ATTRIBUTION, TILE_URL, stampIcon } from "../lib/mapkit";

const icon = stampIcon("•");

function ClickHandler({ onPick }) {
  useMapEvents({
    click: (e) => onPick(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)),
  });
  return null;
}

export default function LocationPicker({ lat, lng, onChange }) {
  const has = lat !== "" && lng !== "";
  const center = has ? [Number(lat), Number(lng)] : DEFAULT_CENTER;
  return (
    <div>
      <div className="picker">
        <MapContainer center={center} zoom={has ? 15 : 10}>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <ClickHandler onPick={onChange} />
          {has && <Marker position={center} icon={icon} />}
        </MapContainer>
      </div>
      <p className="muted small">
        {has ? `Selected: ${lat}, ${lng}` : "Click the map to place the restaurant."}
      </p>
    </div>
  );
}
