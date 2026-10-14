import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../services/api";
import "../../home.css";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getAdminStats(), api.getBookings(), api.getServiceOrders()]).then(([statsResult, bookingResult, orderResult]) => {
      if (!active) return;
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (bookingResult.status === "fulfilled") setBookings(Array.isArray(bookingResult.value) ? bookingResult.value : []);
      if (orderResult.status === "fulfilled") setServiceOrders(Array.isArray(orderResult.value) ? orderResult.value : []);
      if ([statsResult, bookingResult, orderResult].some((result) => result.status === "rejected")) {
        setError("Some dashboard information could not be loaded.");
      }
    });
    return () => { active = false; };
  }, []);

  const pendingBookings = bookings.filter((booking) => booking.status === "PENDING");
  const newServiceOrders = serviceOrders.filter((order) => order.status === "NEW");
  const attentionCount = pendingBookings.length + newServiceOrders.length;
  const metrics = [
    { label: "Fleet vehicles", value: stats?.totalVehicles ?? "-", note: `${stats?.availableVehicles ?? 0} available` },
    { label: "Customers", value: stats?.totalCustomers ?? "-", note: "Registered accounts" },
    { label: "Monthly revenue", value: stats?.monthlyRevenue != null ? `${Number(stats.monthlyRevenue).toLocaleString()} FCFA` : "-", note: "Successful payments" },
    { label: "Total revenue", value: stats?.totalRevenue != null ? `${Number(stats.totalRevenue).toLocaleString()} FCFA` : "-", note: "All-time recorded" }
  ];

  return (
    <section className="section workspace-page admin-workspace">
      <div className="workspace-heading"><div><p className="eyebrow">DRIVERENT · OPERATIONS</p><h1>Admin overview</h1><p className="section-lede">Fleet performance, customer requests and publishing tools in one place.</p></div><Link className="btn" to="/admin/content">Create site content ↗</Link></div>
      {error && <div className="alert">Some dashboard information could not be loaded. Refresh to retry the unavailable section.</div>}
      <div className="metric-grid admin-metric-grid">{metrics.map((metric) => <article className="metric-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></article>)}</div>
      <div className="admin-attention"><div><span className="attention-count">{attentionCount}</span><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Open customer requests</h2><p>Pending bookings and new service requests waiting for review.</p></div></div><div className="attention-actions"><Link to="/admin/bookings">Review {pendingBookings.length} bookings ↗</Link><Link to="/admin/service-orders">Review {newServiceOrders.length} service requests ↗</Link></div></div>
      <div className="workspace-columns admin-workspace-columns">
        <section className="workspace-panel"><div className="workspace-panel-heading"><div><p className="eyebrow">SERVICE DESK</p><h2>Recent service requests</h2></div><Link to="/admin/service-orders">Open queue ↗</Link></div>{serviceOrders.length ? <div className="activity-list">{serviceOrders.slice(0, 4).map((order) => <article key={order.orderId}><span className="service-request-marker">SR</span><div className="activity-main"><strong>{order.serviceTitle}</strong><small>{order.userEmail} · {order.pickupLocation}{order.requestedDate ? ` · ${order.requestedDate}` : ""}</small></div><span className="status-pill">{order.status}</span></article>)}</div> : <div className="workspace-empty"><p>No service requests have arrived yet.</p><Link to="/admin/service-orders">Open service request queue ↗</Link></div>}</section>
        <section className="workspace-panel"><div className="workspace-panel-heading"><div><p className="eyebrow">FLEET PERFORMANCE</p><h2>Most-rented vehicles</h2></div><Link to="/admin/cars">Manage fleet ↗</Link></div>{stats?.topCars?.length ? <div className="top-car-list">{stats.topCars.slice(0, 4).map((car, index) => <article key={car.carId}><span>0{index + 1}</span><strong>{car.carName}</strong><b>{car.rentals} rentals</b></article>)}</div> : <div className="workspace-empty"><p>Vehicle performance will appear as completed rentals are recorded.</p></div>}</section>
      </div>
      <section className="workspace-actions"><div><p className="eyebrow">ADMIN TOOLS</p><h2>Manage the platform</h2></div><div className="workspace-action-grid admin-tools-grid">
        <Link className="workspace-action" to="/admin/cars"><span className="tool-mark">01</span><span><strong>Fleet</strong><small>Add vehicles, photos and rates</small></span><b>↗</b></Link>
        <Link className="workspace-action" to="/admin/bookings"><span className="tool-mark">02</span><span><strong>Bookings</strong><small>Review and approve reservations</small></span><b>↗</b></Link>
        <Link className="workspace-action" to="/admin/customers"><span className="tool-mark">03</span><span><strong>Customers</strong><small>Manage accounts and access</small></span><b>↗</b></Link>
        <Link className="workspace-action" to="/admin/payments"><span className="tool-mark">04</span><span><strong>Payments</strong><small>Review transactions and refunds</small></span><b>↗</b></Link>
        <Link className="workspace-action" to="/admin/content"><span className="tool-mark">05</span><span><strong>Content & offers</strong><small>Publish posts, events and discounts</small></span><b>↗</b></Link>
        <Link className="workspace-action" to="/admin/service-orders"><span className="tool-mark">06</span><span><strong>Service approvals</strong><small>View and update customer requests</small></span><b>↗</b></Link>
      </div></section>
    </section>
  );
}