import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link to="/" className="brand">Food Atlas</Link>
        <nav className="nav-links" aria-label="Main">
          <NavLink to="/" end>Explore</NavLink>
          <NavLink to="/map">Map</NavLink>
          <NavLink to="/add">Add a spot</NavLink>
        </nav>
        <div className="nav-user">
          {user ? (
            <>
              <span className="nav-name">{user.name || user.email}</span>
              <button className="btn btn-ghost" onClick={logout}>Log out</button>
            </>
          ) : (
            <Link className="btn" to="/login">Log in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
