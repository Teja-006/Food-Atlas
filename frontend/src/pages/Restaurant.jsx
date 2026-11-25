import { Link, useParams } from "react-router-dom";
import { catOf, grad } from "../data/mock";
import { useRestaurant } from "../data/restaurants";

export default function Restaurant() {
  const { id } = useParams();
  const { r, error } = useRestaurant(id);
  if (error) return <div className="wrap pad"><p className="meta">{error}</p><Link to="/explore">Back to Explore</Link></div>;
  if (!r) return <div className="wrap pad meta">Loading…</div>;

  const c = catOf(r.cat);
  const dest = Number.isFinite(r.lat) && Number.isFinite(r.lng) ? `${r.lat},${r.lng}` : encodeURIComponent(`${r.name} ${r.address}`);
  const gallery = [0, 1, 2].map((i) => r.images[i] || null);
  return (
    <div className="wrap">
      <div className="cover" style={{ background: grad(c) }}>
        {r.image ? <img src={r.image} alt={r.name} /> : r.name}
      </div>
      <div className="two">
        <div>
          <h1 style={{ fontSize: "clamp(34px,5vw,54px)" }}>{r.name}</h1>
          <p className="meta">★ {r.rating.toFixed(1)} · {[r.primary, r.area].filter(Boolean).join(" · ")}</p>
          {r.about && (<><h2 style={{ fontSize: 26, margin: "28px 0 8px" }}>About</h2><p style={{ color: "var(--mute)" }}>{r.about}</p></>)}
          <h2 style={{ fontSize: 26, margin: "28px 0 0" }}>Gallery</h2>
          <div className="gal">
            {gallery.map((img, i) => (
              <div key={i} style={{ background: img ? `center/cover url(${img})` : grad({ a: i % 2 ? c.b : c.a, b: i % 2 ? c.a : c.b }) }} />
            ))}
          </div>
          <h2 style={{ fontSize: 26, margin: "36px 0 8px" }}>Reviews</h2>
          <p className="meta">{r.reviews ? `${r.reviews} reviews so far.` : "No reviews yet."} Written reviews are coming soon.</p>
        </div>
        <aside className="box" style={{ alignSelf: "start" }}>
          <h3 style={{ fontSize: 22 }}>Details</h3>
          <dl>
            {r.cuisine && (<><dt>Cuisine</dt><dd>{r.cuisine}</dd></>)}
            {r.address && (<><dt>Address</dt><dd>{r.address}</dd></>)}
            {r.hours && (<><dt>Hours</dt><dd>{r.hours}</dd></>)}
            {r.phone && (<><dt>Phone</dt><dd><a href={`tel:${r.phone}`}>{r.phone}</a></dd></>)}
            {r.price && (<><dt>Price</dt><dd>{r.price}</dd></>)}
          </dl>
          <a className="btn" style={{ width: "100%", marginTop: 20, textAlign: "center" }} href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noopener noreferrer">Get directions</a>
        </aside>
      </div>
    </div>
  );
}
