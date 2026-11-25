import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { catOf, grad } from "../data/mock";

export function Navbar() {
  const cls = ({ isActive }) => (isActive ? "on" : "");
  return (
    <nav>
      <div className="wrap">
        <Link className="logo" to="/">Food Atlas</Link>
        <div className="links">
          <NavLink to="/" end className={cls}>Home</NavLink>
          <NavLink to="/explore" className={cls}>Explore</NavLink>
          <NavLink to="/about" className={cls}>About</NavLink>
        </div>
        <Link className="btn acct" to="/profile">Account</Link>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div><h3>Food Atlas</h3><p>Find places worth eating at in Hyderabad and beyond.</p></div>
        <div><h3>Discover</h3><Link to="/about">About</Link><Link to="/explore">Explore</Link></div>
        <div><h3>Contact</h3><a href="mailto:hello@foodatlas.example">hello@foodatlas.example</a></div>
        <div><h3>Follow</h3><a href="#top">Instagram</a><a href="#top">X</a><a href="#top">YouTube</a></div>
      </div>
    </footer>
  );
}

export function Visual({ r, children }) {
  const [bad, setBad] = useState(false);
  return (
    <div className="ph" style={{ background: grad(catOf(r.cat)) }}>
      {r.image && !bad ? <img src={r.image} alt="" loading="lazy" onError={() => setBad(true)} /> : <span>{r.name[0]}</span>}
      {children}
    </div>
  );
}

export function RestaurantCard({ r, big }) {
  return (
    <Link className={"card" + (big ? " big" : "")} to={`/restaurant/${r.id}`}>
      <Visual r={r}><div className="rate">{r.rating.toFixed(1)}</div></Visual>
      <div className="info">
        <h3>{r.name}</h3>
        <div className="meta">{[r.primary, r.area].filter(Boolean).join(" · ")}</div>
      </div>
    </Link>
  );
}

export function Grid({ list, min }) {
  const style = min ? { gridTemplateColumns: `repeat(auto-fill,minmax(${min}px,1fr))` } : undefined;
  return (
    <div className="grid" style={style}>
      {list.map((r) => <RestaurantCard key={r.id} r={r} big={!!min} />)}
    </div>
  );
}

export function Status({ loading, error, children }) {
  if (loading) return <p className="meta">Loading restaurants…</p>;
  if (error) return <p className="meta">Couldn’t load restaurants: {error}</p>;
  return children;
}

export function CategoryTile({ c }) {
  return (
    <Link className="cat" to={`/explore?category=${encodeURIComponent(c.name)}`} style={{ background: grad(c) }}>
      <b>{c.name}</b>
    </Link>
  );
}
