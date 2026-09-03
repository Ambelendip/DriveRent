import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, profile } = useAuth();
  return (
    <section className="section">
      <p className="eyebrow">CUSTOMER AREA</p>
      <h1>Welcome, {profile?.name || user?.name || user?.email}</h1>
      <div className="dashboard-grid">
        <Link className="dashboard-card" to="/dashboard/bookings"><strong>My bookings</strong><span>View and manage reservations →</span></Link>
        <Link className="dashboard-card" to="/dashboard/profile"><strong>My profile</strong><span>Update your personal information →</span></Link>
        <Link className="dashboard-card" to="/cars"><strong>Find a car</strong><span>Browse the fleet →</span></Link>
      </div>
    </section>
  );
}