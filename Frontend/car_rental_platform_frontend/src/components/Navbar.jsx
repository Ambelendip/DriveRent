import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">Drive<span>Rent</span></Link>
      <nav>
        <NavLink to="/cars">Cars</NavLink>
        {user && <NavLink to="/dashboard">Dashboard</NavLink>}
        {user?.role === "ADMIN" && <NavLink to="/admin">Admin</NavLink>}
        {!user ? (
          <>
            <NavLink to="/login">Login</NavLink>
            <Link className="btn btn-small" to="/register">Get Started</Link>
          </>
        ) : (
          <button className="link-button" onClick={handleLogout}>Logout</button>
        )}
      </nav>
    </header>
  );
}