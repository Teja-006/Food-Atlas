const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
    ...options,
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.detail || body.message || message;
    } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export function normalizeRestaurant(raw) {
  const coords = raw.location?.coordinates;
  return {
    ...raw,
    id: String(raw.id ?? raw._id ?? ""),
    name: raw.name || "Unnamed restaurant",
    category: raw.category || "Other",
    cuisine: raw.cuisine || "",
    address: raw.address || "",
    city: raw.city || "",
    area: raw.locality || raw.area || "",
    rating: Number(raw.rating) || 0,
    reviewCount: Number(raw.review_count) || 0,
    description: raw.description || "",
    image: raw.image || raw.images?.[0] || "",
    images: Array.isArray(raw.images) ? raw.images : raw.image ? [raw.image] : [],
    lat: Number.isFinite(Number(raw.lat)) ? Number(raw.lat) : coords?.[1],
    lng: Number.isFinite(Number(raw.lng)) ? Number(raw.lng) : coords?.[0],
    priceRange: raw.price_range || "",
    hours: raw.hours || null,
    phone: raw.phone || "",
  };
}

export const api = {
  restaurants: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    });
    const result = await request(`/api/restaurants${query.size ? `?${query}` : ""}`);
    return { ...result, items: (result.items || []).map(normalizeRestaurant) };
  },
  restaurant: async (id) => normalizeRestaurant(await request(`/api/restaurants/${encodeURIComponent(id)}`)),
  categories: () => request("/api/restaurants/categories"),
  stats: () => request("/api/stats"),
};

export { API_BASE };
