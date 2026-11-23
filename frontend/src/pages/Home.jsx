import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import RestaurantCard from "../components/RestaurantCard.jsx";

export default function Home() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "All";
  const urlQ = params.get("q") || "";
  const minRating = params.get("min_rating") || "";

  const [text, setText] = useState(urlQ);
  const [cats, setCats] = useState([]);
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({ items: [], total: 0 });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
    api.stats().then(setStats).catch(() => {});
  }, []);

  // Debounce typing into the URL.
  useEffect(() => {
    const t = setTimeout(() => text !== urlQ && update({ q: text }), 300);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let live = true;
    setStatus("loading");
    api
      .listRestaurants({
        q: urlQ,
        category: category === "All" ? "" : category,
        min_rating: minRating,
        limit: 60,
      })
      .then((d) => live && (setData(d), setStatus("ready")))
      .catch((e) => live && (setError(e.message), setStatus("error")));
    return () => { live = false; };
  }, [urlQ, category, minRating]);

  const totalAll = cats.reduce((n, c) => n + c.count, 0);

  return (
    <main className="wrap">
      <section className="hero">
        <h1>Every plate, on the map.</h1>
        <p className="lead">
          Restaurants around Sangareddy and Hyderabad, rated and pinned. Search by dish,
          cuisine or street.
        </p>
        <input
          className="search"
          type="search"
          placeholder="Try biryani, cafe, Himayatnagar"
          aria-label="Search restaurants"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {stats && (
          <p className="muted small">
            {stats.total_restaurants} spots, average rating {stats.avg_rating || "not yet set"}
          </p>
        )}
      </section>

      <section className="filters" aria-label="Filters">
        <div className="chips">
          {[{ name: "All", count: totalAll }, ...cats].map((c) => (
            <button
              key={c.name}
              className="chip"
              aria-pressed={category === c.name}
              onClick={() => update({ category: c.name === "All" ? "" : c.name })}
            >
              {c.name} <span>{c.count}</span>
            </button>
          ))}
        </div>
        <label className="inline">
          Minimum rating
          <select value={minRating} onChange={(e) => update({ min_rating: e.target.value })}>
            <option value="">Any</option>
            <option value="3">3.0+</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
          </select>
        </label>
      </section>

      {status === "error" && <p className="error" role="alert">{error}</p>}
      {status === "loading" && <p className="muted">Loading...</p>}
      {status === "ready" && data.items.length === 0 && (
        <p className="empty">Nothing matches that search. Try a broader term or clear the filters.</p>
      )}
      <div className="grid">
        {data.items.map((r) => <RestaurantCard key={r.id} r={r} />)}
      </div>
    </main>
  );
}
