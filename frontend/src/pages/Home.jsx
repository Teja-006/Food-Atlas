import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { CATS, grad } from "../data/mock";
import { useRestaurants } from "../data/restaurants";
import { Grid, CategoryTile, Status } from "../components/ui";

const MOSAIC = [[0, 280], [3, 190], [5, 210], [1, 260], [8, 180], [6, 220]];

export default function Home() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const { items, loading, error } = useRestaurants();
  const go = (e) => { e.preventDefault(); nav(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore"); };

  const trending = [...items].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews).slice(0, 4);
  const popular = [...items].sort((a, b) => b.reviews - a.reviews).slice(0, 6);
  const gems = items.filter((r) => r.rating >= 4.3).sort((a, b) => a.reviews - b.reviews).slice(0, 3);
  const recent = [...items].sort((a, b) => String(b.created).localeCompare(String(a.created))).slice(0, 4);
  const st = { loading, error };

  return (
    <div className="wrap">
      <div className="hero">
        <div>
          <h1>Discover places worth eating at.</h1>
          <p>Explore hidden gems, popular restaurants and unforgettable food experiences.</p>
          <form className="search" onSubmit={go}>
            <input aria-label="Search restaurants" placeholder="Try biryani, cafe, Himayatnagar" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn">Search</button>
          </form>
          <Link className="btn ghost" to="/explore">Explore restaurants</Link>
        </div>
        <div className="mosaic">
          {MOSAIC.map(([i, h], n) => (
            <div key={n} className="t" style={{ height: h, background: grad(CATS[i]), animationDelay: `${n * 0.08}s` }}><em>{CATS[i].name}</em></div>
          ))}
        </div>
      </div>
      <section><h2>Trending restaurants</h2><Status {...st}><Grid list={trending} /></Status></section>
      <section><h2>Explore by taste</h2>
        <div className="cats">{[0, 1, 2, 3, 4, 5, 8, 7].map((i) => <CategoryTile key={i} c={CATS[i]} />)}</div>
      </section>
      <section><h2>Popular restaurants</h2><Status {...st}><Grid list={popular} /></Status></section>
      {gems.length > 0 && <section><h2>Hidden gems</h2><Grid list={gems} min={320} /></section>}
      <section><h2>Recently added</h2><Status {...st}><Grid list={recent} /></Status></section>
      <section><div className="cta"><h2>Your next favourite place is waiting.</h2><Link className="btn" to="/explore">Explore restaurants</Link></div></section>
    </div>
  );
}
