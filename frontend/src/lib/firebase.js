import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);

// getAuth throws on a missing key, so only create it when configured.
export const auth = firebaseConfigured ? getAuth(initializeApp(config)) : null;

const MESSAGES = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
  "auth/weak-password": "Choose a stronger password (at least 8 characters).",
  "auth/invalid-email": "That email address does not look right.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
  "auth/popup-closed-by-user": "The Google window was closed before finishing.",
  "auth/popup-blocked": "Your browser blocked the Google pop-up. Allow pop-ups and try again.",
  "auth/account-exists-with-different-credential":
    "This email is already registered with a different sign-in method.",
  "auth/network-request-failed": "Network problem. Check your connection and try again.",
};

export const friendlyError = (e) => MESSAGES[e?.code] || e?.message || "Something went wrong.";
