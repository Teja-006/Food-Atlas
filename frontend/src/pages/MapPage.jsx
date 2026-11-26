import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { api } from "../api";
import { DEFAULT_CENTER, TILE_ATTRIBUTION, TILE_URL, ratingLabel, stampIcon } from "../lib/mapkit";

function Viewport({ points, focus }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo(focus, 16, { duration: 0.6 });
    else if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
  }, [points, focus, map]);
  return null;
}

export default function MapPage() {
  const [category, setCategory] = useState("All");
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [near, setNear] = useState(null);
  const [focus, setFocus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setFocus(null);
    api
      .listRestaurants({
        category: category === "All" ? "" : category,
        lat: near?.lat,
        lng: near?.lng,
        radius_km: near ? 15 : "",
        limit: 200,
      })
      .then((d) => live && (setItems(d.items), setError("")))
      .catch((e) => live && setError(e.message));
    return () => { live = false; };
  }, [category, near]);

  const points = useMemo(() => items.map((r) => [r.lat, r.lng]), [items]);

  const locate = () =>
    navigator.geolocation.getCurrentPosition(
      (p) => setNear({ lat: p.coords.latitude, lng: p.coords.longitude }),
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
          {near ? (
            <button className="btn btn-ghost" onClick={() => setNear(null)}>Show all</button>
          ) : (
            <button className="btn btn-ghost" onClick={locate}>Near me</button>
          )}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <p className="muted small">{items.length} restaurants</p>
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
        <MapContainer center={DEFAULT_CENTER} zoom={11}>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <Viewport points={points} focus={focus} />
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
