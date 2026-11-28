import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { firebaseConfigured, friendlyError } from "../lib/firebase";

const PASSWORD_RULES = [
  { test: (p) => p.length >= 8, label: "At least 8 characters" },
  { test: (p) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p) => /\d/.test(p), label: "One number" },
];

const passwordOk = (p) => PASSWORD_RULES.every((rule) => rule.test(p));

export default function Auth({ mode }) {
  const isLogin = mode === "login";
  const { login, register, loginWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  const bind = (k) => ({
    value: form[k],
    onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })),
  });

  async function run(action, onDone) {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await action();
      onDone?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const goBack = () => navigate(location.state?.from || "/", { replace: true });

  const submit = (e) => {
    e.preventDefault();
    if (!isLogin && !passwordOk(form.password)) {
      setError("Please meet all password requirements below.");
      return;
    }
    run(
      () => (isLogin ? login(form.email, form.password) : register(form.name, form.email, form.password)),
      () => (isLogin ? goBack() : setJustRegistered(true))
    );
  };

  const google = () => run(loginWithGoogle, goBack);

  const forgot = () => {
    if (!form.email) return setError("Enter your email above first.");
    run(
      () => resetPassword(form.email),
      () => setInfo("If an account exists for that email, a reset link is on its way.")
    );
  };

  if (justRegistered) {
    return (
      <main className="wrap auth">
        <h1>You're all set</h1>
        <p className="muted">
          We sent a verification link to <strong>{form.email}</strong>. You can fill in your profile
          now, or do it later from your account page.
        </p>
        <div className="auth-form" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="btn" type="button" onClick={() => navigate("/profile", { state: { openEdit: true } })}>
            Edit profile now
          </button>
          <button className="btn ghost" type="button" onClick={goBack}>
            I'll do it later
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap auth">
      <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
      {!firebaseConfigured && (
        <p className="error" role="alert">
          Sign-in is not set up yet: add your Firebase values to frontend/.env and restart the dev server.
        </p>
      )}

      <div className="auth-form">
        <button type="button" className="btn btn-google" onClick={google} disabled={busy}>
          Continue with Google
        </button>
        <div className="divider">or use email</div>

        <form className="form single" onSubmit={submit}>
          {!isLogin && (
            <label>Name
              <input autoComplete="name" maxLength={80} {...bind("name")} />
            </label>
          )}
          <label>Email
            <input type="email" required autoComplete="email" {...bind("email")} />
          </label>
          <label>Password
            <input
              type="password"
              required
              minLength={isLogin ? 1 : 8}
              autoComplete={isLogin ? "current-password" : "new-password"}
              {...bind("password")}
            />
          </label>
          {!isLogin && (
            <ul className="pw-rules">
              {PASSWORD_RULES.map((rule) => (
                <li key={rule.label} className={rule.test(form.password) ? "ok" : ""}>
                  {rule.test(form.password) ? "✓" : "•"} {rule.label}
                </li>
              ))}
            </ul>
          )}
          {isLogin && (
            <button type="button" className="link-btn" onClick={forgot} disabled={busy}>
              Forgot your password?
            </button>
          )}
          {error && <p className="error" role="alert">{error}</p>}
          {info && <p className="notice" role="status">{info}</p>}
          <button className="btn" disabled={busy}>
            {busy ? "Please wait..." : isLogin ? "Log in" : "Sign up"}
          </button>
        </form>
      </div>

      <p className="muted">
        {isLogin ? "New here? " : "Already have an account? "}
        <Link to={isLogin ? "/register" : "/login"} state={location.state}>
          {isLogin ? "Create an account" : "Log in"}
        </Link>
      </p>
    </main>
  );
}