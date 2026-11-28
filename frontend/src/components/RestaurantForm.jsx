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
  const [customCategory, setCustomCategory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.categories().then((list) => {
      setCats(list);
      // If editing something whose category isn't in the known list, start in "new category" mode.
      if (initial?.category && !list.some((c) => c.name === initial.category)) {
        setCustomCategory(true);
      }
    }).catch(() => {});
  }, [initial]);

  const bind = (k) => ({
    value: f[k],
    onChange: (e) => setF((prev) => ({ ...prev, [k]: e.target.value })),
  });

  function setPhone(e) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setF((prev) => ({ ...prev, phone: digits }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (f.lat === "" || f.lng === "") {
      setError("Place the restaurant on the map first.");
      return;
    }
    if (f.phone && f.phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    if (!f.category.trim()) {
      setError("Choose a category, or request a new one.");
      return;
    }
    const payload = {
      ...f,
      lat: Number(f.lat),
      lng: Number(f.lng),
      price_range: f.price_range || null,
      image: f.image || null,
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
      <h3 className="fh full">Basic details</h3>
      <label>Name
        <input required minLength={2} maxLength={120} {...bind("name")} />
      </label>
      <label>Cuisine
        <input required placeholder="Indian, Hyderabadi, Biryani" maxLength={120} {...bind("cuisine")} />
      </label>

      <label>Category
        {!customCategory ? (
          <select
            value={cats.some((c) => c.name === f.category) ? f.category : ""}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setCustomCategory(true);
                setF((prev) => ({ ...prev, category: "" }));
              } else {
                setF((prev) => ({ ...prev, category: e.target.value }));
              }
            }}
          >
            <option value="" disabled>Choose a category</option>
            {cats.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            <option value="__new__">+ Request a new category…</option>
          </select>
        ) : (
          <>
            <input
              placeholder="Name your new category"
              maxLength={60}
              {...bind("category")}
            />
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setCustomCategory(false);
                setF((prev) => ({ ...prev, category: "" }));
              }}
            >
              Choose an existing category instead
            </button>
          </>
        )}
      </label>
      {customCategory && (
        <p className="muted small full" style={{ margin: "-10px 0 0" }}>
          New categories are reviewed by our team along with the rest of your submission.
        </p>
      )}

      <label>Price range
        <select {...bind("price_range")}>
          <option value="">Not set</option>
          <option>₹</option><option>₹₹</option><option>₹₹₹</option><option>₹₹₹₹</option>
        </select>
      </label>

      <h3 className="fh full">Description</h3>
      <label className="full">
        <textarea rows={3} maxLength={1000} {...bind("description")} />
      </label>

      <h3 className="fh full">Contact & hours</h3>
      <label className="full">Address
        <input maxLength={250} {...bind("address")} />
      </label>
      <label>Phone
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit number"
          value={f.phone}
          onChange={setPhone}
        />
      </label>
      <label>Hours
        <input placeholder="11:00 AM - 11:00 PM" maxLength={60} {...bind("hours")} />
      </label>

      <h3 className="fh full">Photo</h3>
      <label className="full">Image URL
        <input type="url" placeholder="https://..." {...bind("image")} />
      </label>

      <h3 className="fh full">Location</h3>
      <div className="full">
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