import { useEffect, useState } from "react";
import { api } from "../api";
import LocationPicker from "./LocationPicker.jsx";

const MAX_IMAGES = 6;

export default function RestaurantForm({ initial, onSubmit, submitLabel }) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    cuisine: initial?.cuisine ?? "",
    category: initial?.category ?? "",
    description: initial?.description ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    hours: initial?.hours ?? "",
    menu_image: initial?.menu_image ?? "",
    lat: initial?.lat ?? "",
    lng: initial?.lng ?? "",
  });
  const [images, setImages] = useState(
    initial?.images?.length ? initial.images : [""]
  );
  const [cats, setCats] = useState([]);
  const [customCategory, setCustomCategory] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.categories().then((list) => {
      setCats(list);
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

  function setImageAt(i, value) {
    setImages((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function addImageField() {
    setImages((prev) => (prev.length < MAX_IMAGES ? [...prev, ""] : prev));
  }

  function removeImageField(i) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
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
      menu_image: f.menu_image || null,
      images: images.map((v) => v.trim()).filter(Boolean),
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
            <input placeholder="Name your new category" maxLength={60} {...bind("category")} />
            <button
              type="button"
              className="link-btn"
              onClick={() => { setCustomCategory(false); setF((prev) => ({ ...prev, category: "" })); }}
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

      {/* Price range — removed for now. To bring it back, uncomment this block
          and add price_range back into the submitted payload.
      <label>Price range
        <select {...bind("price_range")}>
          <option value="">Not set</option>
          <option>₹</option><option>₹₹</option><option>₹₹₹</option><option>₹₹₹₹</option>
        </select>
      </label>
      */}

      <h3 className="fh full">Description</h3>
      <label className="full">
        <textarea rows={3} maxLength={1000} {...bind("description")} />
      </label>

      <h3 className="fh full">Contact & hours</h3>
      <label className="full">Address
        <input maxLength={250} {...bind("address")} />
      </label>
      <label>Phone
        <input type="tel" inputMode="numeric" maxLength={10} placeholder="10-digit number" value={f.phone} onChange={setPhone} />
      </label>
      <label>Hours
        <input placeholder="11:00 AM - 11:00 PM" maxLength={60} {...bind("hours")} />
      </label>

      <h3 className="fh full">Photos</h3>
      <p className="muted small full" style={{ margin: "-6px 0 0" }}>
        Paste links to photos (there is no file upload yet — add as many as you like).
      </p>
      <div className="full image-url-list">
        {images.map((url, i) => (
          <div className="image-url-row" key={i}>
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setImageAt(i, e.target.value)}
            />
            {images.length > 1 && (
              <button type="button" className="link-btn" onClick={() => removeImageField(i)}>Remove</button>
            )}
          </div>
        ))}
        {images.length < MAX_IMAGES && (
          <button type="button" className="btn-ghost btn" onClick={addImageField}>+ Add another photo</button>
        )}
      </div>

      <label className="full">Menu photo URL (optional)
        <input type="url" placeholder="https://..." {...bind("menu_image")} />
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