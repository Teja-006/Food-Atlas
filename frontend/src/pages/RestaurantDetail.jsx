import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { api } from "../api";
import { useAuth } from "../auth.jsx";
import { Stamp, Thumb } from "../components/RestaurantCard.jsx";
import { TILE_ATTRIBUTION, TILE_URL, directionsLink, ratingLabel, stampIcon } from "../lib/mapkit";

export default function RestaurantDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [r, setR] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setR(null);
    api.getRestaurant(id).then(setR).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="wrap pad">
        <p className="error">{error}</p>
        <Link to="/">Back to Explore</Link>
      </main>
    );
  }
  if (!r) return <main className="wrap pad muted">Loading...</main>;

  const canEdit = user && (user.is_admin || user.id === r.added_by);

  async function remove() {
    if (!window.confirm(`Delete ${r.name}? This cannot be undone.`)) return;
    try {
      await api.deleteRestaurant(id);
      navigate("/");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="wrap detail">
      <div className="detail-media">
        <Thumb src={r.image || r.images?.[0]} name={r.name} className="detail-img" />
        <Stamp rating={r.rating} />
      </div>
      <div className="detail-info">
        <h1>{r.name}</h1>
        <p className="lead">{r.cuisine}{r.price_range ? `, ${r.price_range}` : ""}</p>
        {r.description && <p>{r.description}</p>}
        <dl className="facts">
          {r.address && (<><dt>Address</dt><dd>{r.address}</dd></>)}
          {r.hours && (<><dt>Hours</dt><dd>{r.hours}</dd></>)}
          {r.phone && (<><dt>Phone</dt><dd><a href={`tel:${r.phone}`}>{r.phone}</a></dd></>)}
          {r.review_count > 0 && (<><dt>Reviews</dt><dd>{r.review_count}</dd></>)}
        </dl>
        <div className="actions">
          <a className="btn btn-ghost" href={directionsLink(r.lat, r.lng)} target="_blank" rel="noopener noreferrer">
            Get directions
          </a>
          {canEdit && (
            <>
              <Link className="btn btn-ghost" to={`/restaurants/${id}/edit`}>Edit</Link>
              <button className="btn btn-danger" onClick={remove}>Delete</button>
            </>
          )}
        </div>
      </div>
      <div className="mini-map">
        <MapContainer center={[r.lat, r.lng]} zoom={15} scrollWheelZoom={false}>
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
          <Marker position={[r.lat, r.lng]} icon={stampIcon(ratingLabel(r.rating))} />
        </MapContainer>
      </div>
    </main>
  );
}
