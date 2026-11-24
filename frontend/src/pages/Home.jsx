import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Grid, LoadingGrid, Notice } from "../components/ui";

const CATEGORIES = [
  ["Biryani & Indian", "Indian"], ["Cafes & coffee", "Cafe"], ["Chinese", "Chinese"],
  ["Desserts", "Dessert"], ["Street food", "Street Food"], ["Fast food", "Fast Food"],
];

export default function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.restaurants({ limit: 12 }), api.stats()])
      .then(([data, s]) => { if (active) { setRestaurants(data.items); setStats(s); } })
      .catch((e) => { if (active) setError(`${e.message}. Check that your FastAPI backend is running.`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const search = (e) => { e.preventDefault(); navigate(`/explore${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`); };
  return <div className="wrap">
    <section className="hero">
      <div className="hero-copy">
        <div className="eyebrow"><span /> THE CITY, SERVED</div>
        <h1>Good food.<br /><i>Great discoveries.</i></h1>
        <p>Find your next favourite table, from neighbourhood classics to places you haven't heard of yet.</p>
        <form className="search" onSubmit={search}>
          <span className="search-icon">⌕</span>
          <input aria-label="Search restaurants" placeholder="Search a restaurant, cuisine or area…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn">Explore</button>
        </form>
        <div className="hero-note">Discover local favourites, one meal at a time.</div>
      </div>
      <div className="hero-art">
        <div className="hero-image hero-image-main"><div className="image-label">A little taste of Hyderabad</div></div>
        <div className="hero-image hero-image-small"><span>Made for food lovers</span></div>
        <div className="hero-stamp">FOOD<br />IS A<br /><b>JOURNEY</b></div>
      </div>
    </section>

    <section className="stats-row">
      <div><strong>{stats?.total_restaurants?.toLocaleString("en-IN") ?? "—"}</strong><span>Places to discover</span></div>
      <div><strong>{stats?.total_users?.toLocaleString("en-IN") ?? "—"}</strong><span>Food explorers</span></div>
      <div><strong>{stats?.avg_rating ? Number(stats.avg_rating).toFixed(1) : "—"}</strong><span>Community average</span></div>
      <Link to="/explore" className="text-link">See all restaurants ↗</Link>
    </section>

    <section>
      <div className="section-head"><div><div className="eyebrow">THE SHORTLIST</div><h2>Worth a closer look</h2></div><Link className="text-link" to="/explore">View all ↗</Link></div>
      {error && <Notice>{error}</Notice>}
      {loading ? <LoadingGrid /> : <Grid list={restaurants} />}
      {!loading && !restaurants.length && !error && <Notice type="info">Your restaurant collection is empty. Import your restaurant data into MongoDB to get started.</Notice>}
    </section>

    <section className="category-section">
      <div className="section-head"><div><div className="eyebrow">FOLLOW YOUR CRAVING</div><h2>Explore by taste</h2></div><Link className="text-link" to="/explore">All categories ↗</Link></div>
      <div className="category-grid">{CATEGORIES.map(([label, value], i) => <Link key={value} to={`/explore?category=${encodeURIComponent(value)}`} className={`category-tile tile-${i}`}><span>0{i + 1}</span><b>{label}</b><em>Explore ↗</em></Link>)}</div>
    </section>

    <section className="closing-cta"><div><div className="eyebrow">YOUR TABLE IS WAITING</div><h2>Hungry for something new?</h2><p>Let the next great meal find you.</p></div><Link to="/explore" className="btn btn-light">Find your place ↗</Link></section>
  </div>;
}
