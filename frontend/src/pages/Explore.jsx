import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRestaurantSearch } from "../data/restaurants";
import { CATS, grad } from "../data/mock";
import { api } from "../api";
import { Grid, Status } from "../components/ui";

const FALLBACK_COLOR = { a: "#2a3547", b: "#0f1b2d" };

// Waits until the user stops typing before searching.
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function Explore() {
  const [sp, setSp] = useSearchParams();
  const cat = sp.get("category") || "All";
  const [q, setQ] = useState(sp.get("q") || "");
  const [sort, setSort] = useState("rating");
  const [cats, setCats] = useState([]);
  const debouncedQ = useDebounced(q.trim(), 400);

  
  const { items, total, loading, loadingMore, error, loadMore, hasMore } =
    useRestaurantSearch({ q: debouncedQ, category: cat, sort });

  // Category buttons come from the database, so each one matches real data.
  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
  }, []);

  const setCat = (c) => {
    const n = new URLSearchParams(sp);
    if (c === "All") n.delete("category");
    else n.set("category", c);
    setSp(n);
  };

  // Use the mock colour when the names match, otherwise a neutral colour.
  const colourFor = (name) =>
    grad(CATS.find((x) => x.name === name) || FALLBACK_COLOR);

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <h1 style={{ fontSize: "clamp(36px,5vw,56px)" }}>Explore</h1>

      <div className="bar" style={{ marginTop: 20 }}>
        <div className="search">
          <input
            aria-label="Search"
            placeholder="Search by name, cuisine or area"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="rating">Top rated</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <div className="strip">
        <button
          className={"ct" + (cat === "All" ? " on" : "")}
          style={{ background: grad(FALLBACK_COLOR) }}
          onClick={() => setCat("All")}
        >
          <b>All</b>
        </button>
        {cats.map((c) => (
  <button
    key={c.name}
    className={"ct" + (cat === c.name ? " on" : "")}
    style={{ background: grad(CATS.find((x) => x.name === c.name) || { a: "#2a3547", b: "#0f1b2d" }) }}
    onClick={() => setCat(c.name)}
  >
    <b>{c.name}</b>
  </button>
))}
      </div>

      <Status loading={loading} error={error}>
        {items.length ? (
          <>
            <p className="meta">Showing {items.length} of {total}</p>
            <Grid list={items} />
            {hasMore && (
              <div style={{ textAlign: "center", margin: "24px 0" }}>
                <button className="btn" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="meta">No restaurants match. Clear the search or pick another category.</p>
        )}
      </Status>
    </div>
  );
}