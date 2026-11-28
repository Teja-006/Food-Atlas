import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";

const LABELS = {
  pending: "Waiting for review",
  approved: "Approved",
  rejected: "Not approved",
  withdrawn: "Withdrawn",
};

const when = (iso) => (iso ? new Date(iso).toLocaleDateString() : "");

export default function MySubmissions() {
  const location = useLocation();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const justSubmitted = location.state?.justSubmitted;

  const load = useCallback(async () => {
    try {
      const data = await api.mySubmissions();
      setItems(data.items || []);
      setError("");
    } catch (e) {
      setError(e.message);
      setItems((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function withdraw(item) {
    if (!window.confirm(`Withdraw "${item.name}"? It will not be reviewed.`)) return;
    setBusyId(item.id);
    try {
      await api.withdrawSubmission(item.id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="wrap narrow">
      <Link to="/profile" className="back-link">← Back to profile</Link>
      <h1>My submissions</h1>

      {justSubmitted && (
        <p className="notice" role="status">
          Thanks! <strong>{justSubmitted}</strong> was sent for review. It will appear on Food Atlas
          once it is approved.
        </p>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {items === null && <p className="muted">Loading...</p>}

      {items && items.length === 0 && !error && (
        <p className="muted">
          You have not submitted any places yet. <Link to="/add" style={{ textDecoration: "underline" }}>Add one</Link>.
        </p>
      )}

      <div className="sub-list">
        {(items || []).map((item) => (
          <article className="sub-card" key={item.id}>
            <div className="sub-head">
              <h3>{item.name}</h3>
              <span className={`status-pill s-${item.status}`}>{LABELS[item.status] || item.status}</span>
            </div>

            <div className="sub-meta">
              {item.data?.cuisine && <span className="sub-tag">{item.data.cuisine}</span>}
              {item.data?.category && <span className="sub-tag">{item.data.category}</span>}
              <span className="sub-date">Sent {when(item.submitted_at)}</span>
              {item.decided_at && <span className="sub-date">Decided {when(item.decided_at)}</span>}
            </div>

            {item.status === "pending" && (
              <p className="sub-note">We will let it appear on Food Atlas as soon as it has been checked.</p>
            )}
            {item.status === "approved" && item.restaurant_id && (
              <p className="sub-note">
                It is live! <Link to={`/restaurant/${item.restaurant_id}`}>View the listing →</Link>
              </p>
            )}
            {item.status === "rejected" && (
              <p className="sub-note">{item.reason ? <>Reason: {item.reason}</> : "It was not approved."}</p>
            )}

            {item.status === "pending" && (
              <button
                className="btn ghost"
                type="button"
                disabled={busyId === item.id}
                onClick={() => withdraw(item)}
              >
                {busyId === item.id ? "Working..." : "Withdraw"}
              </button>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}