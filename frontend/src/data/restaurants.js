import { useEffect, useState } from "react";
import { api } from "../api";

// Maps database category/cuisine text to the existing display categories.
const RULES = [
  ["Italian", /italian|pizza|pasta|mediterranean/],
  ["Chinese", /chinese|asian|thai|noodle/],
  ["Japanese", /japanese|sushi|ramen/],
  ["Desserts", /dessert|ice ?cream|sweet|gelato/],
  ["Cafes", /caf[eé]|coffee|bakery/],
  ["Fast Food", /fast ?food|burger|fries/],
  ["Street Food", /street|barbecue|bbq|chaat|snack/],
  ["Indian", /indian|biryani|hyderabadi|mughlai|curry|thali|dosa/],
  ["Healthy Food", /vegetarian|vegan|healthy|organic|salad/],
];

export function toCategory(text = "") {
  const value = String(text).toLowerCase();
  return (RULES.find(([, regex]) => regex.test(value)) || ["Other"])[0];
}

export function normalize(r) {
  const cuisine = r.cuisine || "";
  const address = r.address || "";

  const rawImages = [
    r.image,
    ...(Array.isArray(r.images) ? r.images : [r.images]),
  ];

  const images = [
    ...new Set(rawImages.filter((image) => typeof image === "string" && image)),
  ];

  const categoryText = `${r.category || ""} ${cuisine}`;

  return {
    ...r,
    id: String(r.id ?? r._id ?? ""),
    name: r.name || "Unnamed restaurant",
    cat: toCategory(categoryText),
    cuisine,
    primary: cuisine.split(",")[0].trim() || r.category || "",
    address,
    area: r.locality || r.area || address.split(",").filter(Boolean).pop()?.trim() || "",
    rating: Number(r.rating) || 0,
    reviews: Number(r.review_count) || 0,
    about: r.description || "",
    hours: r.hours || "",
    phone: r.phone || "",
    price: r.price_range || "",
    image: images[0] || null,
    images,
    lat: Number(r.lat),
    lng: Number(r.lng),
    created: r.created_at || "",
  };
}

export function useRestaurants() {
  const [state, setState] = useState({
    items: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    let active = true;

    api
      .listRestaurants({ limit: 200 })
      .then((data) => {
        if (!active) return;

        setState({
          items: (data.items || []).map(normalize),
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;

        setState({
          items: [],
          loading: false,
          error: error.message || "Unable to load restaurants",
        });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

export function useRestaurant(id) {
  const [state, setState] = useState({
    r: null,
    loading: true,
    error: "",
  });

  useEffect(() => {
    let active = true;

    setState({ r: null, loading: true, error: "" });

    api
      .getRestaurant(id)
      .then((data) => {
        if (!active) return;

        setState({
          r: normalize(data),
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        if (!active) return;

        setState({
          r: null,
          loading: false,
          error: error.message || "Unable to load restaurant",
        });
      });

    return () => {
      active = false;
    };
  }, [id]);

  return state;
}