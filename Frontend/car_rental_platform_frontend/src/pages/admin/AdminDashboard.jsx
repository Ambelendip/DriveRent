import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <section className="section">
      <p className="eyebrow">ADMINISTRATION</p><h1>Admin dashboard</h1>
      <div className="dashboard-grid">
        <Link className="dashboard-card" to="/admin/cars"><strong>Manage cars</strong><span>Add, edit and remove vehicles →</span></Link>
        <Link className="dashboard-card" to="/admin/bookings"><strong>Manage bookings</strong><span>Review and update reservations →</span></Link>
      </div>
    </section>
  );
}