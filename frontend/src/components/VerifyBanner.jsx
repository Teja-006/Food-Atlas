import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { friendlyError } from "../lib/firebase";

export default function VerifyBanner() {
  const { user, resendVerification, refresh } = useAuth();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || user.email_verified) return null;

  async function run(action, okMessage) {
    setBusy(true);
    setMsg("");
    try {
      await action();
      setMsg(okMessage);
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="banner" role="status">
      <div className="wrap banner-inner">
        <span>
          Verify <strong>{user.email}</strong> to add or edit spots. {msg}
        </span>
        <span className="banner-actions">
          <button className="btn btn-ghost" disabled={busy} onClick={() => run(resendVerification, "Email sent.")}>
            Resend email
          </button>
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => run(refresh, "Not verified yet. Check your inbox and spam folder.")}
          >
            Check again
          </button>
        </span>
      </div>
    </div>
  );
}
