// Category tiles only. Restaurants now come from your API (see restaurants.js).
export const CATS = [
  { name: "Indian", a: "#6b3a1e", b: "#1d1009" },
  { name: "Italian", a: "#35523f", b: "#101c15" },
  { name: "Chinese", a: "#6b2735", b: "#1c0b10" },
  { name: "Japanese", a: "#2c4260", b: "#0c131d" },
  { name: "Cafes", a: "#5e4a36", b: "#1a130c" },
  { name: "Desserts", a: "#5c3d52", b: "#1a0f17" },
  { name: "Street Food", a: "#7a5a22", b: "#1d1407" },
  { name: "Fast Food", a: "#4c4540", b: "#14110f" },
  { name: "Healthy Food", a: "#3f6350", b: "#0f1b15" },
];
const OTHER = { name: "Other", a: "#3a4350", b: "#10151c" };
export const catOf = (name) => CATS.find((c) => c.name === name) || OTHER;
export const grad = (c) => `linear-gradient(135deg,${c.a},${c.b})`;
