import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import RestaurantForm from "../components/RestaurantForm.jsx";

export function AddSpot() {
  const navigate = useNavigate();
  return (
    <main className="wrap narrow">
      <Link to="/profile" className="back-link">← Back to profile</Link>
      <h1>Know a place we're missing?</h1>
      <p className="muted">
        Found a spot that deserves to be on the map? Add it to Food Atlas. Every submission —
        including any new category you request — is checked by our team before it appears,
        usually within a few days.
      </p>
      <RestaurantForm
        submitLabel="Send for review"
        onSubmit={async (payload) => {
          await api.submitRestaurant(payload);
          navigate("/my-submissions", { state: { justSubmitted: payload.name } });
        }}
      />
    </main>
  );
}

export default AddSpot;