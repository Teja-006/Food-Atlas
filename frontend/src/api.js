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

  createRestaurant: (body) =>
    request("/restaurants", { method: "POST", body }),

  updateRestaurant: (id, body) =>
    request(`/restaurants/${encodeURIComponent(id)}`, {
      method: "PUT",
      body,
    }),

  deleteRestaurant: (id) =>
    request(`/restaurants/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  stats: () => request("/stats"),
};