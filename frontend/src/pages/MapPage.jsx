import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from "@react-google-maps/api";
import { api } from "../api";
import { DEFAULT_CENTER, ratingLabel } from "../lib/mapkit";

const MAX_MARKERS = 200;
const containerStyle = { width: "100%", height: "100%" };
const LOADER_ID = "food-atlas-google-maps";

export default function MapPage() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef(null);
  const [category, setCategory] = useState("All");
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [bbox, setBbox] = useState(null);
  const [focus, setFocus] = useState(null);
  const [active, setActive] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
  }, []);

  const reportBounds = useCallback(() => {
    const map = mapRef.current;
    const b = map?.getBounds();
    if (!b) return;
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    setBbox(`${sw.lng()},${sw.lat()},${ne.lng()},${ne.lat()}`);
  }, []);

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    reportBounds();
  }, [reportBounds]);

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

  useEffect(() => {
    if (focus && mapRef.current) {
      mapRef.current.panTo({ lat: focus[0], lng: focus[1] });
      mapRef.current.setZoom(16);
    }
  }, [focus]);

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
        {loadError && <p className="error" role="alert">Could not load the map. Check the API key.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <p className="muted small">
          Showing {items.length} of {total} in this area
          {total > MAX_MARKERS && ". Zoom in to see more."}
        </p>
        <ul className="map-list">
          {items.map((r) => (
            <li key={r.id}>
              <button onClick={() => { setFocus([r.lat, r.lng]); setActive(r); }}>
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
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={DEFAULT_CENTER}
            zoom={12}
            onLoad={onLoad}
            onIdle={reportBounds}
            options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
          >
            {items.map((r) => (
              <Marker
                key={r.id}
                position={{ lat: r.lat, lng: r.lng }}
                label={{ text: ratingLabel(r.rating), fontSize: "11px", fontWeight: "700" }}
                onClick={() => setActive(r)}
              />
            ))}
            {active && (
              <InfoWindow position={{ lat: active.lat, lng: active.lng }} onCloseClick={() => setActive(null)}>
                <div>
                  <strong>{active.name}</strong>
                  <br />
                  {active.cuisine}
                  <br />
                  <Link to={`/restaurant/${active.id}`}>View details</Link>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <p className="muted small" style={{ padding: 20 }}>Loading map…</p>
        )}
      </div>
    </main>
  );
}