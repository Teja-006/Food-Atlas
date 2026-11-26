import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ratingLabel } from "../lib/mapkit";
import { api } from "../api";
import { useAuth } from "../auth.jsx";

export function Thumb({ src, name, className = "" }) {
  const [bad, setBad] = useState(false);

  if (!src || bad) {
    return (
      <div className={`thumb thumb-empty ${className}`} aria-hidden="true">
        {name?.[0]}
      </div>
    );
  }

  return (
    <img
      className={`thumb ${className}`}
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBad(true)}
    />
  );
}

export function Stamp({ rating }) {
  return <span className="stamp" title="Rating">{ratingLabel(rating)}</span>;
}

export default function RestaurantCard({ r }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!user) {
      setSaved(false);
      return;
    }

    api.savedPlaces()
      .then((data) => {
        if (active) {
          setSaved((data.items || []).some((item) => String(item.id ?? item._id) === String(r.id)));
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user, r.id]);

  async function toggleSaved(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      setError("Log in to save places.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (saved) {
        await api.unsavePlace(r.id);
        setSaved(false);
      } else {
        await api.savePlace(r.id);
        setSaved(true);
      }
    } catch (err) {
      setError(err.message || "Could not update saved place.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card">
      <Link to={`/restaurant/${r.id}`}>
        <div className="card-media">
          <Thumb src={r.image} name={r.name} />
          <Stamp rating={r.rating} />
        </div>
        <div className="card-body">
          <h3>{r.name}</h3>
          <p className="muted">{r.cuisine}</p>
          <p className="card-meta">
            {r.price_range && <span>{r.price_range}</span>}
            {r.address && <span>{r.address}</span>}
          </p>
        </div>
      </Link>

      <button type="button" onClick={toggleSaved} disabled={busy}>
        {busy ? "Saving…" : saved ? "♥ Saved" : "♡ Save"}
      </button>

      {error && <p className="meta">{error}</p>}
    </article>
  );
}