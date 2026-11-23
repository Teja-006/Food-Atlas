import { auth } from "./lib/firebase";

const BASE = import.meta.env.VITE_API_URL || "";

function errorMessage(data, status) {
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d.map((e) => `${e.loc.slice(1).join(".")}: ${e.msg}`).join("; ");
  }
  return `Request failed (${status})`;
}

async function request(path, { method = "GET", body, params } = {}) {
  let qs = "";
  if (params) {
    const clean = Object.entries(params).filter(([, v]) => v !== "" && v != null);
    if (clean.length) qs = "?" + new URLSearchParams(clean);
  }

  // Firebase returns a cached ID token and refreshes it automatically when it expires.
  const token = await auth?.currentUser?.getIdToken();
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}/api${path}${qs}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(errorMessage(data, res.status));
  return data;
}

export const api = {
  me: () => request("/auth/me"),
  listRestaurants: (params) => request("/restaurants", { params }),
  categories: () => request("/restaurants/categories"),
  getRestaurant: (id) => request(`/restaurants/${id}`),
  createRestaurant: (body) => request("/restaurants", { method: "POST", body }),
  updateRestaurant: (id, body) => request(`/restaurants/${id}`, { method: "PUT", body }),
  deleteRestaurant: (id) => request(`/restaurants/${id}`, { method: "DELETE" }),
  stats: () => request("/stats"),
};
