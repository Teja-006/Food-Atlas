import { useState } from "react";
import { Link } from "react-router-dom";
import { ratingLabel } from "../lib/mapkit";

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
    <img className={`thumb ${className}`} src={src} alt="" loading="lazy" onError={() => setBad(true)} />
  );
}

export function Stamp({ rating }) {
  return <span className="stamp" title="Rating">{ratingLabel(rating)}</span>;
}

export default function RestaurantCard({ r }) {
  return (
    <Link to={`/restaurants/${r.id}`} className="card">
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
  );
}
