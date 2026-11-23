import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import RestaurantForm from "../components/RestaurantForm.jsx";

export function AddSpot() {
  const navigate = useNavigate();
  return (
    <main className="wrap narrow">
      <h1>Add a spot</h1>
      <RestaurantForm
        submitLabel="Add restaurant"
        onSubmit={async (payload) => {
          const created = await api.createRestaurant(payload);
          navigate(`/restaurants/${created.id}`);
        }}
      />
    </main>
  );
}

export function EditSpot() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [r, setR] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getRestaurant(id).then(setR).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <main className="wrap narrow"><p className="error">{error}</p></main>;
  if (!r) return <main className="wrap narrow muted">Loading...</main>;

  return (
    <main className="wrap narrow">
      <h1>Edit {r.name}</h1>
      <RestaurantForm
        initial={r}
        submitLabel="Save changes"
        onSubmit={async (payload) => {
          await api.updateRestaurant(id, payload);
          navigate(`/restaurants/${id}`);
        }}
      />
    </main>
  );
}
