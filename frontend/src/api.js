import { auth } from "./lib/firebase";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function errorMessage(data, status) {
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => `${item.loc?.slice(1).join(".")}: ${item.msg}`)
      .join("; ");
  }

  return `Request failed (${status})`;
}

async function request(path, { method = "GET", body, params } = {}) {
  const query = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== "" && value != null) {
        query.set(key, String(value));
      }
    });
  }

  const queryString = query.size ? `?${query.toString()}` : "";

  const token = await auth?.currentUser?.getIdToken();

  const headers = {
    Accept: "application/json",
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE}/api${path}${queryString}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorMessage(data, response.status));
  }

  return data;
}

export const api = {
  me: () => request("/auth/me"),

  listRestaurants: (params = {}) =>
    request("/restaurants", { params }),

  categories: () => request("/restaurants/categories"),

  getRestaurant: (id) =>
    request(`/restaurants/${encodeURIComponent(id)}`),

  // New places are never published directly: they are sent for review.
  submitRestaurant: (body) =>
    request("/submissions", { method: "POST", body }),

  mySubmissions: () => request("/submissions/mine"),

  withdrawSubmission: (id) =>
    request(`/submissions/${encodeURIComponent(id)}`, { method: "DELETE" }),

  stats: () => request("/stats"),

  savedPlaces: () => request("/users/me/places"),

  savePlace: (id) =>
    request(`/users/me/places/${encodeURIComponent(id)}`, {
      method: "PUT",
    }),

  unsavePlace: (id) =>
    request(`/users/me/places/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

// Shared cache: every restaurant card asks for the same saved list,
// so load it once instead of once per card.
let savedCache = null;

export function savedPlacesOnce() {
  if (!savedCache) {
    savedCache = api.savedPlaces().catch((err) => {
      savedCache = null; // don't keep failed requests
      throw err;
    });
  }
  return savedCache;
}

export function clearSavedCache() {
  savedCache = null;
}