import { useEffect } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { Navbar, Footer } from "./components/ui";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Restaurant from "./pages/Restaurant";
import About from "./pages/About";
import Profile from "./pages/Profile";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
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
          {/* Homepage */}
          <Route path="/" element={<Home />} />

          {/* Restaurant exploration */}
          <Route path="/explore" element={<Explore />} />

          {/* Restaurant details - support both URL formats */}
          <Route
            path="/restaurants/:id"
            element={<Restaurant />}
          />

          <Route
            path="/restaurant/:id"
            element={<Restaurant />}
          />

          {/* Other pages */}
          <Route path="/about" element={<About />} />
          <Route path="/profile" element={<Profile />} />

          {/* Redirect categories to Explore */}
          <Route
            path="/categories"
            element={<Navigate to="/explore" replace />}
          />

          {/* Unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </main>

      <Footer />
    </>
  );
}