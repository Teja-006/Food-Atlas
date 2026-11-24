import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { Grid, LoadingGrid, Notice } from "../components/ui";

export default function Explore() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  const [category, setCategory] = useState(sp.get("category") || "");
  const [cuisine, setCuisine] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [sort, setSort] = useState("rating");
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const limit = 48;

  useEffect(() => { api.categories().then(setCategories).catch(() => setCategories([])); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    const timer = setTimeout(() => {
      api.restaurants({ q: q.trim() || undefined, category: category || undefined, cuisine: cuisine.trim() || undefined, min_rating: Number(minRating), limit, skip: page * limit })
        .then((data) => { if (active) { setItems(data.items); setTotal(data.total); } })
        .catch((e) => { if (active) setError(`${e.message}. Make sure the backend is running at the configured API address.`); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [q, category, cuisine, minRating, page]);

  const updateCategory = (value) => { setCategory(value); setPage(0); const next = new URLSearchParams(sp); value ? next.set("category", value) : next.delete("category"); setSp(next, { replace: true }); };
  const sorted = useMemo(() => [...items].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : b.rating - a.rating), [items, sort]);
  const clear = () => { setQ(""); setCuisine(""); setMinRating("0"); updateCategory(""); setPage(0); };

  return <div className="wrap page-shell">
    <div className="page-intro"><div className="eyebrow">THE FOOD ATLAS DIRECTORY</div><h1>Find your next<br /><i>favourite place.</i></h1><p>Search restaurants, browse categories and narrow it down to exactly what you're craving.</p></div>
    <div className="filter-panel">
      <label className="filter-search"><span>⌕</span><input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Restaurant, dish, cuisine or neighbourhood" /></label>
      <label className="filter-field"><span>Category</span><select value={category} onChange={(e) => updateCategory(e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}</select></label>
      <label className="filter-field"><span>Cuisine</span><input value={cuisine} onChange={(e) => { setCuisine(e.target.value); setPage(0); }} placeholder="e.g. Hyderabadi" /></label>
      <label className="filter-field"><span>Minimum rating</span><select value={minRating} onChange={(e) => { setMinRating(e.target.value); setPage(0); }}><option value="0">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option><option value="4.5">4.5+ stars</option></select></label>
    </div>
    <div className="results-head"><div><strong>{total.toLocaleString("en-IN")}</strong> places found</div><div className="results-actions"><button className="clear-btn" onClick={clear}>Clear filters</button><select aria-label="Sort restaurants" value={sort} onChange={(e) => setSort(e.target.value)}><option value="rating">Highest rated</option><option value="name">Name A–Z</option></select></div></div>
    {error && <Notice>{error}</Notice>}
    {loading ? <LoadingGrid /> : <Grid list={sorted} />}
    {!loading && total > 0 && <div className="pagination"><button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Previous</button><span>Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}</span><button disabled={(page + 1) * limit >= total} onClick={() => setPage((p) => p + 1)}>Next →</button></div>}
  </div>;
}
