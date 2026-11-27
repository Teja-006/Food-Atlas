import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { api } from "../api";
import { DEFAULT_CENTER, TILE_ATTRIBUTION, TILE_URL, ratingLabel, stampIcon } from "../lib/mapkit";

const MAX_MARKERS = 200;

// Flies to a point when one is chosen from the list or "Near me".
function Focus({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16, { duration: 0.6 });
  }, [target, map]);
  return null;
}

// Reports the visible area whenever the map is panned or zoomed.
function BoundsWatcher({ onChange }) {
  const map = useMapEvents({
    moveend() {
      onChange(map.getBounds());
    },
  });
  useEffect(() => {
    onChange(map.getBounds());
  }, [map, onChange]);
  return null;
}

export default function MapPage() {
  const [category, setCategory] = useState("All");
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [bbox, setBbox] = useState(null);
  const [focus, setFocus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
  }, []);

  const onBounds = useCallback((b) => {
    setBbox(`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`);
  }, []);

  useEffect(() => {
    if (!bbox) return undefined;
    let live = true;
    api
      .listRestaurants({
        category: category === "All" ? "" : category,
        bbox,
        sort: "rating",
        limit: MAX_MARKERS,
      })
      .then((d) => {
        if (!live) return;
        setItems(d.items || []);
        setTotal(d.total || 0);
        setError("");
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [bbox, category]);

  const locate = () =>
    navigator.geolocation.getCurrentPosition(
      (p) => setFocus([p.coords.latitude, p.coords.longitude]),
      () => setError("Location permission was denied.")
    );

  return (
    <main className="mapview">
      <aside className="map-side">
        <div className="map-tools">
          <label className="inline">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>All</option>
              {cats.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          </label>
          <button className="btn btn-ghost" onClick={locate}>Near me</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <p className="muted small">
          Showing {items.length} of {total} in this area
          {total > MAX_MARKERS && ". Zoom in to see more."}
        </p>
        <ul className="map-list">
          {items.map((r) => (
            <li key={r.id}>
              <button onClick={() => setFocus([r.lat, r.lng])}>
                <span className="stamp pin">{ratingLabel(r.rating)}</span>
                <span>
                  <strong>{r.name}</strong>
                  <br />
                  <span className="muted small">{r.cuisine}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="map-canvas">
        <MapContainer center={DEFAULT_CENTER} zoom={12}>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <BoundsWatcher onChange={onBounds} />
          <Focus target={focus} />
          {items.map((r) => (
            <Marker key={r.id} position={[r.lat, r.lng]} icon={stampIcon(ratingLabel(r.rating))}>
              <Popup>
                <strong>{r.name}</strong>
                <br />
                {r.cuisine}
                <br />
                <Link to={`/restaurant/${r.id}`}>View details</Link>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </main>
  );
}