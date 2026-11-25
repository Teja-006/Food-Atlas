import { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { Navbar, Footer } from "./components/ui";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Restaurant from "./pages/Restaurant";
import About from "./pages/About";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";

import "./index.css";
import "./wired.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />

      <Navbar />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/restaurant/:id" element={<Restaurant />} />
          <Route path="/about" element={<About />} />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />

          <Route
            path="/categories"
            element={<Navigate to="/explore" replace />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
    </>
  );
}