import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Notice } from "../components/ui";

export default function Restaurant() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.restaurant(id).then((r) => { if (active) setRestaurant(r); })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="wrap page-shell"><div className="detail-skeleton" /></div>;
  if (error || !restaurant) return <div className="wrap page-shell"><Notice>{error || "Restaurant not found."}</Notice><Link className="text-link" to="/explore">← Back to Explore</Link></div>;

  const r = restaurant;
  const location = [r.area, r.city].filter(Boolean).join(", ") || r.address || "Location not provided";
  const mapUrl = Number.isFinite(r.lat) && Number.isFinite(r.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}` : null;
  const photos = r.images.length ? r.images : r.image ? [r.image] : [];

  return <div className="wrap detail-page">
    <Link className="back-link" to="/explore">← Back to Explore</Link>
    <div className="detail-hero" style={r.image ? { backgroundImage: `linear-gradient(0deg,rgba(10,18,22,.65),transparent 65%),url("${r.image}")` } : undefined}>
      {!r.image && <span>{r.name}</span>}
      <div className="detail-title"><div className="eyebrow">FOOD ATLAS FIND</div><h1>{r.name}</h1><p>{r.category}{r.cuisine ? ` · ${r.cuisine}` : ""}</p></div>
    </div>
    <div className="detail-layout">
      <div className="detail-main">
        <div className="detail-rating"><strong>★ {r.rating ? r.rating.toFixed(1) : "Not rated"}</strong><span>{r.reviewCount ? `${r.reviewCount.toLocaleString("en-IN")} reviews` : "No reviews yet"}</span></div>
        <h2>About this place</h2><p className="detail-description">{r.description || "There is no description for this restaurant yet."}</p>
        {photos.length > 0 && <><h2>Photos</h2><div className="photo-grid">{photos.map((url, i) => <img key={`${url}-${i}`} src={url} alt={`${r.name} photo ${i + 1}`} loading="lazy" />)}</div></>}
      </div>
      <aside className="detail-aside">
        <div className="eyebrow">THE DETAILS</div>
        <dl>
          <dt>Location</dt><dd>{location}</dd>
          {r.address && <><dt>Address</dt><dd>{r.address}</dd></>}
          <dt>Category</dt><dd>{r.category || "Not specified"}</dd>
          <dt>Cuisine</dt><dd>{r.cuisine || "Not specified"}</dd>
          <dt>Price range</dt><dd>{r.priceRange || "Not specified"}</dd>
          <dt>Opening hours</dt><dd>{typeof r.hours === "string" ? r.hours : r.hours ? JSON.stringify(r.hours) : "Contact restaurant"}</dd>
          {r.phone && <><dt>Phone</dt><dd><a href={`tel:${r.phone}`}>{r.phone}</a></dd></>}
        </dl>
        {mapUrl ? <a className="btn full-btn" href={mapUrl} target="_blank" rel="noreferrer">Get directions ↗</a> : <p className="muted-small">Directions unavailable: this listing has no coordinates.</p>}
      </aside>
    </div>
  </div>;
}
