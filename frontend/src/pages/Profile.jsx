import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const KEY = "food-atlas-preferences";
const DEFAULTS = { name: "", city: "Hyderabad", area: "", diet: "No preference", spice: "Medium", budget: "₹₹", cuisines: [] };

export default function Profile() {
  const [form, setForm] = useState(DEFAULTS);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try { setForm({ ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }); } catch {}
  }, []);
  const change = (key) => (e) => { setSaved(false); setForm((old) => ({ ...old, [key]: e.target.value })); };
  const submit = (e) => { e.preventDefault(); localStorage.setItem(KEY, JSON.stringify(form)); setSaved(true); };
  return <div className="wrap page-shell profile-shell">
    <div className="page-intro"><div className="eyebrow">YOUR FOOD COMPASS</div><h1>Make it <i>your taste.</i></h1><p>Save your food preferences on this device to keep your discoveries close.</p></div>
    <form className="profile-card" onSubmit={submit}>
      <div className="profile-avatar">F</div>
      <h2>Your preferences</h2>
      <p className="muted-small">These preferences are stored locally in this browser. They are not linked to your account.</p>
      <div className="profile-fields">
        <label className="filter-field"><span>Display name</span><input value={form.name} onChange={change("name")} placeholder="What should we call you?" /></label>
        <label className="filter-field"><span>City</span><input value={form.city} onChange={change("city")} /></label>
        <label className="filter-field"><span>Neighbourhood</span><input value={form.area} onChange={change("area")} placeholder="e.g. Madhapur" /></label>
        <label className="filter-field"><span>Diet</span><select value={form.diet} onChange={change("diet")}>{["No preference", "Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="filter-field"><span>Spice preference</span><select value={form.spice} onChange={change("spice")}>{["Mild", "Medium", "Hot"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="filter-field"><span>Usual budget</span><select value={form.budget} onChange={change("budget")}>{["₹", "₹₹", "₹₹₹", "₹₹₹₹"].map((x) => <option key={x}>{x}</option>)}</select></label>
      </div>
      <button className="btn">Save preferences</button>{saved && <span className="saved-message">Saved on this device ✓</span>}
    </form>
    <p className="profile-footnote">Ready to discover somewhere new? <Link to="/explore">Explore restaurants ↗</Link></p>
  </div>;
}
