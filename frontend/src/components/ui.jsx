import { Link, NavLink } from "react-router-dom";

export function Navbar() {
  const cls = ({ isActive }) => (isActive ? "on" : "");
  return (
    <nav>
      <div className="wrap nav-inner">
        <Link className="logo" to="/" aria-label="Food Atlas home"><span className="logo-mark">F</span> Food Atlas</Link>
        <div className="links">
          <NavLink to="/" end className={cls}>Home</NavLink>
          <NavLink to="/explore" className={cls}>Explore</NavLink>
          <NavLink to="/about" className={cls}>About</NavLink>
        </div>
        <Link className="btn acct" to="/profile">My taste</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap footer-grid">
        <div><Link className="footer-logo" to="/">Food Atlas</Link><p>Find places worth eating at in Hyderabad and beyond.</p></div>
        <div><h3>Discover</h3><Link to="/explore">Explore restaurants</Link><Link to="/about">Our story</Link></div>
        <div><h3>Explore by</h3><Link to="/explore?category=Indian">Indian food</Link><Link to="/explore?category=Cafe">Cafes</Link></div>
        <div><h3>Back to the table</h3><a href="#top">Back to top ↑</a></div>
      </div>
      <div className="wrap footer-bottom">© {new Date().getFullYear()} Food Atlas. Made for curious appetites.</div>
    </footer>
  );
}

export function RestaurantCard({ restaurant, onToggleSave, saved = false }) {
  const r = restaurant;
  const location = [r.area, r.city].filter(Boolean).join(", ") || r.address;
  return (
    <article className="card">
      <Link to={`/restaurant/${r.id}`} className="card-link">
        <div className="ph" style={r.image ? { backgroundImage: `linear-gradient(180deg,transparent 55%,rgba(0,0,0,.45)),url("${r.image}")` } : undefined}>
          {!r.image && <span>{r.name?.[0] || "F"}</span>}
          {r.rating > 0 && <span className="rate">★ {r.rating.toFixed(1)}</span>}
        </div>
        <div className="info">
          <div className="card-kicker">{r.category || "Restaurant"}{r.cuisine ? ` · ${r.cuisine}` : ""}</div>
          <h3>{r.name}</h3>
          <p className="meta">{location || "Location not provided"}</p>
          {r.priceRange && <p className="price">{r.priceRange}</p>}
        </div>
      </Link>
      {onToggleSave && <button className={`save-btn ${saved ? "saved" : ""}`} onClick={() => onToggleSave(r.id)} aria-label={saved ? "Remove saved restaurant" : "Save restaurant"}>{saved ? "♥" : "♡"}</button>}
    </article>
  );
}

export function Grid({ list, onToggleSave, savedIds = [] }) {
  if (!list?.length) return <div className="empty"><span>◌</span><h3>No restaurants found</h3><p>Try changing your search or filters.</p></div>;
  return <div className="grid">{list.map((r) => <RestaurantCard key={r.id} restaurant={r} onToggleSave={onToggleSave} saved={savedIds.includes(r.id)} />)}</div>;
}

export function LoadingGrid() {
  return <div className="grid">{Array.from({ length: 6 }, (_, i) => <div className="card skeleton" key={i}><div className="ph" /><div className="info"><div className="sk-line" /><div className="sk-line short" /></div></div>)}</div>;
}

export function Notice({ children, type = "error" }) {
  return <div className={`notice ${type}`} role="status">{children}</div>;
}
