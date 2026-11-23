import { Link, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import VerifyBanner from "./components/VerifyBanner.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home.jsx";
import MapPage from "./pages/MapPage.jsx";
import RestaurantDetail from "./pages/RestaurantDetail.jsx";
import { AddSpot, EditSpot } from "./pages/Spot.jsx";
import Auth from "./pages/Auth.jsx";

const NotFound = () => (
  <main className="wrap pad">
    <h1>Page not found</h1>
    <p><Link to="/">Back to Explore</Link></p>
  </main>
);

export default function App() {
  return (
    <>
      <Navbar />
      <VerifyBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/restaurants/:id" element={<RestaurantDetail />} />
        <Route path="/add" element={<ProtectedRoute><AddSpot /></ProtectedRoute>} />
        <Route path="/restaurants/:id/edit" element={<ProtectedRoute><EditSpot /></ProtectedRoute>} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
