import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">Drive<span>Rent</span></Link>
      <button
        className="menu-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span />
        <span />
        <span />
      </button>
      <nav id="primary-navigation" className={menuOpen ? "open" : ""}>
        <NavLink to="/cars" onClick={() => setMenuOpen(false)}>Cars</NavLink>
        <NavLink to="/services" onClick={() => setMenuOpen(false)}>Services</NavLink>
        <NavLink to="/#tours" onClick={() => setMenuOpen(false)}>Tours</NavLink>
        {user && <NavLink to={user.role === "ADMIN" ? "/admin" : "/dashboard"} onClick={() => setMenuOpen(false)}>{user.role === "ADMIN" ? "Admin" : "Dashboard"}</NavLink>}
        {user && user.role !== "ADMIN" && <NavLink to="/dashboard/bookings" onClick={() => setMenuOpen(false)}>Bookings</NavLink>}
        {user && user.role !== "ADMIN" && <NavLink to="/dashboard/payments" onClick={() => setMenuOpen(false)}>Payments</NavLink>}
        {user && user.role !== "ADMIN" && <NavLink to="/dashboard/notifications" onClick={() => setMenuOpen(false)}>Notifications</NavLink>}
        {user?.role === "ADMIN" && <NavLink to="/admin/cars" onClick={() => setMenuOpen(false)}>Manage cars</NavLink>}
        {!user ? (
          <>
            <NavLink to="/login" onClick={() => setMenuOpen(false)}>Login</NavLink>
            <Link className="btn btn-small" to="/register" onClick={() => setMenuOpen(false)}>Get Started</Link>
          </>
        ) : (
          <button className="link-button" onClick={() => { setMenuOpen(false); handleLogout(); }}>Logout</button>
        )}
      </nav>
    </header>
  );
}