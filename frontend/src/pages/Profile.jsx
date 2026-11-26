import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CATS } from "../data/mock";
import { useAuth } from "../auth.jsx";
import { api } from "../api";
import { Grid } from "../components/ui";
import { normalize } from "../data/restaurants";

function Field({ label, children }) {
  return <label className="fl">{label}{children}</label>;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState("");

  const initial = {
    name: user?.name || user?.display_name || "",
    email: user?.email || "",
    phone: "",
    dob: "",
    gender: "Prefer not to say",
    city: "",
    area: "",
    bio: "",
    diet: "No preference",
    spice: "Medium",
    budget: "₹₹",
    cuisines: [],
    n1: true,
    n2: false,
  };

  const [form, setForm] = useState(initial);
  const [profile, setProfile] = useState(initial);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    api.savedPlaces()
      .then((data) => {
        if (active) setSavedPlaces(data.items || []);
      })
      .catch((error) => {
        if (active) setSavedError(error.message || "Could not load saved places.");
      })
      .finally(() => {
        if (active) setSavedLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const set = (k) => (e) => {
    setSaved(false);
    setForm({
      ...form,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });
  };

  const toggle = (name) => {
    setSaved(false);
    setForm({
      ...form,
      cuisines: form.cuisines.includes(name)
        ? form.cuisines.filter((item) => item !== name)
        : [...form.cuisines, name],
    });
  };

  const submit = (e) => {
    e.preventDefault();
    setProfile(form);
    setSaved(true);
  };

  const input = (label, k, type = "text", ph = "") => (
    <Field label={label}>
      <input type={type} value={form[k]} placeholder={ph} onChange={set(k)} />
    </Field>
  );

  const select = (label, k, opts) => (
    <Field label={label}>
      <select value={form[k]} onChange={set(k)}>
        {opts.map((option) => <option key={option}>{option}</option>)}
      </select>
    </Field>
  );

  const out = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="wrap" style={{ paddingTop: 40, width: "100%", maxWidth: "none" }}>
      <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div className="av">{(profile.name || profile.email || "?")[0].toUpperCase()}</div>
        <div>
          <h1 style={{ fontSize: 36 }}>{profile.name || "Your profile"}</h1>
          <p className="meta">{profile.email}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
        <Link className="btn" to="/add">Add a place</Link>
        <Link className="btn ghost" to="/my-submissions">My submissions</Link>
      </div>

      <h2 style={{ fontSize: 28, margin: "36px 0 16px" }}>Edit profile</h2>

      <form className="box" onSubmit={submit}>
        <h3 className="fh">Personal details</h3>
        <div className="fg">
          {input("Full name", "name")}
          {input("Email", "email", "email")}
          {input("Phone number", "phone", "tel", "+91")}
          {input("Date of birth", "dob", "date")}
          {select("Gender", "gender", ["Male", "Female", "Non-binary", "Prefer not to say"])}
        </div>

        <h3 className="fh">Location</h3>
        <div className="fg">
          {input("City", "city")}
          {input("Neighbourhood", "area", "text", "e.g. Madhapur")}
        </div>

        <h3 className="fh">About you</h3>
        <Field label="Short bio">
          <textarea rows={3} value={form.bio} placeholder="What do you love to eat?" onChange={set("bio")} />
        </Field>

        <h3 className="fh">Food preferences</h3>
        <div className="fg">
          {select("Diet", "diet", ["No preference", "Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan"])}
          {select("Spice level", "spice", ["Mild", "Medium", "Hot"])}
          {select("Usual budget", "budget", ["₹", "₹₹", "₹₹₹"])}
        </div>

        <p className="meta" style={{ margin: "16px 0 0" }}>Favourite cuisines</p>
        <div className="chips" style={{ marginTop: 8 }}>
          {CATS.map((category) => (
            <button
              type="button"
              key={category.name}
              className={"chip" + (form.cuisines.includes(category.name) ? " on" : "")}
              onClick={() => toggle(category.name)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <h3 className="fh">Notifications</h3>
        <label className="tg">
          <input type="checkbox" checked={form.n1} onChange={set("n1")} />
          New restaurants near me
        </label>
        <label className="tg">
          <input type="checkbox" checked={form.n2} onChange={set("n2")} />
          Weekly picks by email
        </label>

        <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 24 }}>
          <button className="btn">Save changes</button>
          {saved && <span className="meta">Saved on this device only for now</span>}
        </div>
      </form>

      <section style={{ paddingBottom: 0 }}>
        <h2 style={{ fontSize: 28 }}>Favourite restaurants</h2>
        <p className="meta">Favourite restaurants are not connected yet.</p>
      </section>

      <section style={{ paddingBottom: 0 }}>
        <h2 style={{ fontSize: 28 }}>Saved places</h2>

        {savedLoading && <p className="meta">Loading saved places…</p>}
        {savedError && <p className="meta">{savedError}</p>}

        {!savedLoading && !savedError && savedPlaces.length === 0 && (
          <p className="meta">
            No saved places yet. <Link to="/explore" style={{ textDecoration: "underline" }}>Find a place you love</Link>.
          </p>
        )}

        {savedPlaces.length > 0 && <Grid list={savedPlaces.map(normalize)} />}
      </section>

      <section>
        <button className="btn ghost" onClick={out}>Log out</button>
      </section>
    </div>
  );
}