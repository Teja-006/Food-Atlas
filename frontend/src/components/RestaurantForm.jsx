import { useEffect, useState } from "react";
import { api } from "../api";
import LocationPicker from "./LocationPicker.jsx";

const FIELDS = [
  "name", "cuisine", "category", "description", "address", "phone",
  "hours", "price_range", "image", "lat", "lng",
];

export default function RestaurantForm({ initial, onSubmit, submitLabel }) {
  const [f, setF] = useState(() =>
    Object.fromEntries(FIELDS.map((k) => [k, initial?.[k] ?? ""]))
  );
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
  }, []);

  const bind = (k) => ({
    value: f[k],
    onChange: (e) => setF((prev) => ({ ...prev, [k]: e.target.value })),
  });

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (f.lat === "" || f.lng === "") {
      setError("Place the restaurant on the map first.");
      return;
    }
    const payload = {
      ...f,
      lat: Number(f.lat),
      lng: Number(f.lng),
      price_range: f.price_range || null,
      image: f.image || null,
      category: f.category || "Other",
    };
    setBusy(true);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>Name
        <input required minLength={2} maxLength={120} {...bind("name")} />
      </label>
      <label>Cuisine
        <input required placeholder="Indian, Hyderabadi, Biryani" maxLength={120} {...bind("cuisine")} />
      </label>
      <label>Category
        <input list="category-list" placeholder="Biryani" maxLength={60} {...bind("category")} />
        <datalist id="category-list">
          {cats.map((c) => <option key={c.name} value={c.name} />)}
        </datalist>
      </label>
      <label>Price range
        <select {...bind("price_range")}>
          <option value="">Not set</option>
          <option>₹</option><option>₹₹</option><option>₹₹₹</option><option>₹₹₹₹</option>
        </select>
      </label>
      <label className="full">Description
        <textarea rows={3} maxLength={1000} {...bind("description")} />
      </label>
      <label className="full">Address
        <input maxLength={250} {...bind("address")} />
      </label>
      <label>Phone
        <input maxLength={30} inputMode="tel" pattern="[0-9+()\-\s.]*" title="Digits, spaces and + - ( ) . only" {...bind("phone")} />
      </label>
      <label>Hours
        <input placeholder="11:00 AM - 11:00 PM" maxLength={60} {...bind("hours")} />
      </label>
      <label>Image URL
        <input type="url" placeholder="https://..." {...bind("image")} />
      </label>
      <div className="full">
        <span className="label-text">Location</span>
        <LocationPicker
          lat={f.lat}
          lng={f.lng}
          onChange={(lat, lng) => setF((prev) => ({ ...prev, lat, lng }))}
        />
      </div>
      {error && <p className="error full" role="alert">{error}</p>}
      <div className="full">
        <button className="btn" disabled={busy}>{busy ? "Sending..." : submitLabel}</button>
      </div>
    </form>
  );
}
