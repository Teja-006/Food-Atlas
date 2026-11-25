import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CATS, grad } from "../data/mock";
import { useRestaurants } from "../data/restaurants";
import { Grid, Status } from "../components/ui";

export default function Explore() {
  const [sp, setSp] = useSearchParams();
  const cat = sp.get("category") || "All";
  const [q, setQ] = useState(sp.get("q") || "");
  const [sort, setSort] = useState("rating");
  const { items, loading, error } = useRestaurants();

  const setCat = (c) => {
    const n = new URLSearchParams(sp);
    c === "All" ? n.delete("category") : n.set("category", c);
    setSp(n);
  };
  const list = items
    .filter((r) => (cat === "All" || r.cat === cat) && `${r.name} ${r.cuisine} ${r.address}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : b.rating - a.rating));

  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <h1 style={{ fontSize: "clamp(36px,5vw,56px)" }}>Explore</h1>
      <div className="bar" style={{ marginTop: 20 }}>
        <div className="search"><input aria-label="Search" placeholder="Search by name, cuisine or area" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="rating">Top rated</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <div className="strip">
        <button className={"ct" + (cat === "All" ? " on" : "")} style={{ background: grad({ a: "#2a3547", b: "#0f1b2d" }) }} onClick={() => setCat("All")}><b>All</b></button>
        {CATS.map((c) => (
          <button key={c.name} className={"ct" + (cat === c.name ? " on" : "")} style={{ background: grad(c) }} onClick={() => setCat(c.name)}><b>{c.name}</b></button>
        ))}
      </div>
      <Status loading={loading} error={error}>
        {list.length ? <Grid list={list} /> : <p className="meta">No restaurants match. Clear the search or pick another category.</p>}
      </Status>
    </div>
  );
}
