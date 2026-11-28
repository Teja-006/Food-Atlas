import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import RestaurantForm from "../components/RestaurantForm.jsx";

export function AddSpot() {
  const navigate = useNavigate();
  return (
    <main className="wrap narrow">
      <Link to="/profile" className="back-link">← Back to profile</Link>
      <h1>Add a place</h1>
      <p className="muted">
        Know a great place that is missing? Tell us about it. Every submission — including any new
        category you request — is checked by our team before it appears on Food Atlas, usually
        within a few days.
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