import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { api } from "../api";
import { Grid } from "../components/ui";
import { normalize } from "../data/restaurants";

function Field({ label, children }) {
  return <label className="fl">{label}{children}</label>;
}

const BLANK_PROFILE = {
  name: "",
  username: "",
  phone: "",
  dob: "",
  gender: "Prefer not to say",
  city: "",
  area: "",
  photo_url: "",
  notify_near_me: true,
  notify_weekly: false,
};

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(BLANK_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedNote, setSavedNote] = useState(false);

  const [savedPlaces, setSavedPlaces] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState("");

  useEffect(() => {
    let active = true;
    api.getProfile()
      .then((data) => {
        if (active) setProfile({ ...BLANK_PROFILE, ...data, photo_url: data.photo_url || "" });
      })
      .catch((error) => {
        if (active) setProfileError(error.message || "Could not load your profile.");
      })
      .finally(() => active && setProfileLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.savedPlaces()
      .then((data) => active && setSavedPlaces(data.items || []))
      .catch((error) => active && setSavedError(error.message || "Could not load saved places."))
      .finally(() => active && setSavedLoading(false));
    return () => { active = false; };
  }, []);

  // Arriving from "Edit profile now" right after registration.
  useEffect(() => {
    if (!profileLoading && profile && location.state?.openEdit) {
      setForm(profile);
      setEditing(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [profileLoading, profile, location.state, location.pathname, navigate]);

  function startEditing() {
    setForm(profile || BLANK_PROFILE);
    setSaveError("");
    setSavedNote(false);
    setEditing(true);
  }

  const set = (k) => (e) => {
    let value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    if (k === "phone") value = value.replace(/\D/g, "").slice(0, 10);
    if (k === "username") value = value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 30);
    setForm((prev) => ({ ...prev, [k]: value }));
  };

  async function submit(e) {
    e.preventDefault();
    if (form.phone && form.phone.length !== 10) {
      setSaveError("Phone number must be exactly 10 digits.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const updated = await api.updateProfile({
        ...form,
        photo_url: form.photo_url || null,
      });
      setProfile({ ...BLANK_PROFILE, ...updated, photo_url: updated.photo_url || "" });
      setEditing(false);
      setSavedNote(true);
      await refresh(); // picks up a changed name or photo in the navbar
    } catch (error) {
      setSaveError(error.message || "Could not save your changes.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = profile?.name || user?.name || "";
  const avatarLetter = (displayName || user?.email || "?")[0].toUpperCase();

  const out = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="profile-shell">
      <div className="profile-head">
        {profile?.photo_url ? (
          <img className="av av-photo" src={profile.photo_url} alt="" />
        ) : (
          <div className="av">{avatarLetter}</div>
        )}
        <div>
          <h1 style={{ fontSize: 36 }}>{displayName || "Your profile"}</h1>
          {profile?.username && <p className="meta">@{profile.username}</p>}
          <p className="meta">{user?.email}</p>
        </div>
      </div>

      <div className="profile-actions">
        <Link className="btn" to="/add">Add a place</Link>
        <Link className="btn ghost" to="/my-submissions">My submissions</Link>
      </div>

      <h2 style={{ fontSize: 28, margin: "36px 0 16px" }}>Profile details</h2>

      {profileLoading && <p className="meta">Loading your profile…</p>}
      {profileError && <p className="meta">{profileError}</p>}

      {!profileLoading && !profileError && !editing && (
        <div className="profile-summary">
          <dl>
            <div><dt>Username</dt><dd>{profile.username ? `@${profile.username}` : "Not set"}</dd></div>
            <div><dt>Phone number</dt><dd>{profile.phone || "Not set"}</dd></div>
            <div><dt>Date of birth</dt><dd>{profile.dob || "Not set"}</dd></div>
            <div><dt>Gender</dt><dd>{profile.gender}</dd></div>
            <div><dt>City</dt><dd>{profile.city || "Not set"}</dd></div>
            <div><dt>Neighbourhood</dt><dd>{profile.area || "Not set"}</dd></div>
          </dl>
          <div style={{ marginTop: 20 }}>
            <button className="btn" type="button" onClick={startEditing}>Edit profile</button>
          </div>
          {savedNote && <p className="meta" style={{ marginTop: 10 }}>Saved.</p>}
        </div>
      )}

      {editing && (
        <form className="box" onSubmit={submit}>
          <h3 className="fh">Personal details</h3>
          <div className="fg">
            <Field label="Full name">
              <input value={form.name} maxLength={80} onChange={set("name")} />
            </Field>
            <Field label="Username">
              <input value={form.username} placeholder="e.g. sai_teja" maxLength={30} onChange={set("username")} />
            </Field>
            <Field label="Phone number">
              <input
                type="tel"
                inputMode="numeric"
                value={form.phone}
                placeholder="10-digit number"
                maxLength={10}
                onChange={set("phone")}
              />
            </Field>
            <Field label="Date of birth">
              <input type="date" value={form.dob} onChange={set("dob")} />
            </Field>
            <Field label="Gender">
              <select value={form.gender} onChange={set("gender")}>
                {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
          </div>

          <h3 className="fh">Location</h3>
          <div className="fg">
            <Field label="City">
              <input value={form.city} maxLength={80} onChange={set("city")} />
            </Field>
            <Field label="Neighbourhood">
              <input value={form.area} placeholder="e.g. Madhapur" maxLength={80} onChange={set("area")} />
            </Field>
          </div>

          <h3 className="fh">Profile photo</h3>
          <Field label="Photo URL">
            <input type="url" value={form.photo_url} placeholder="https://..." onChange={set("photo_url")} />
          </Field>
          <p className="muted small">
            Paste a link to an image (there is no file upload yet). Leave blank to use your initial instead.
          </p>

          <h3 className="fh">Notifications</h3>
          <label className="tg">
            <input type="checkbox" checked={form.notify_near_me} onChange={set("notify_near_me")} />
            New restaurants near me
          </label>
          <label className="tg">
            <input type="checkbox" checked={form.notify_weekly} onChange={set("notify_weekly")} />
            Weekly picks by email
          </label>

          {saveError && <p className="error full" role="alert">{saveError}</p>}

          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 24 }}>
            <button className="btn" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            <button type="button" className="btn ghost" disabled={saving} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

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