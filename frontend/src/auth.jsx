import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { api, clearSavedCache } from "./api";
import { auth } from "./lib/firebase";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const notConfigured = () =>
  Promise.reject(new Error("Firebase is not configured. Fill in frontend/.env and restart."));

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ask the backend who we are (also records the user).
  const loadProfile = useCallback(async () => {
    if (!auth?.currentUser) return setUser(null);
    try {
      setUser((await api.me()).user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async () => {
      await loadProfile();
      setLoading(false);
    });
  }, [loadProfile]);

  // Re-read the Firebase user and force a fresh token (picks up email_verified).
  const refresh = useCallback(async () => {
    if (!auth?.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    await loadProfile();
  }, [loadProfile]);

  const value = useMemo(() => {
    if (!auth) {
      return {
        user, loading, refresh,
        login: notConfigured, loginWithGoogle: notConfigured, register: notConfigured,
        resendVerification: notConfigured, resetPassword: notConfigured, logout: notConfigured,
      };
    }
    return {
      user,
      loading,
      refresh,
      // Each sign-in awaits loadProfile so the page doesn't redirect before `user` is set.
      login: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
        await loadProfile();
      },
      loginWithGoogle: async () => {
        await signInWithPopup(auth, new GoogleAuthProvider());
        await loadProfile();
      },
      register: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
        await sendEmailVerification(cred.user);
        await refresh();
      },
      resendVerification: () => sendEmailVerification(auth.currentUser),
      resetPassword: (email) => sendPasswordResetEmail(auth, email),
      logout: async () => {
        await signOut(auth);
        clearSavedCache(); // don't show the previous user's saved state to the next user
        setUser(null);
      },
    };
  }, [user, loading, refresh, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}