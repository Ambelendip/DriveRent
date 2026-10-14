import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import "../home.css";

function Icon({ name }) {
  const paths = {
    bookings: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    payments: (
      <>
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </>
    ),
    notifications: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
    profile: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    car: (
      <>
        <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
        <path d="M3 11h18a1 1 0 0 1 1 1v4h-2" />
        <path d="M2 16v-4a1 1 0 0 1 1-1h1" />
        <path d="M4 12v4" />
        <rect x="6" y="14" width="4" height="2" rx="1" />
        <rect x="14" y="14" width="4" height="2" rx="1" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </>
    )
  };

  return (
    <span className="icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths[name]}
      </svg>
    </span>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const name = profile?.name || user?.name || user?.email || "there";
  const [summary, setSummary] = useState({ bookings: [], payments: [], serviceOrders: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.getBookings(), api.getPayments(), api.getServiceOrders()])
      .then(([bookingResult, paymentResult, serviceResult]) => {
        if (!active) return;
        const value = (result) => result.status === "fulfilled" ? result.value : [];
        setSummary({
          bookings: Array.isArray(value(bookingResult)) ? value(bookingResult) : value(bookingResult)?.bookings || [],
          payments: Array.isArray(value(paymentResult)) ? value(paymentResult) : value(paymentResult)?.payments || [],
          serviceOrders: Array.isArray(value(serviceResult)) ? value(serviceResult) : []
        });
        const failed = [bookingResult, paymentResult, serviceResult].find((result) => result.status === "rejected");
        if (failed) setError("Some account information could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  const upcomingCount = summary.bookings.filter((booking) =>
    ["PENDING", "CONFIRMED"].includes(booking.status)
  ).length;
  const completedCount = summary.bookings.filter((booking) => booking.status === "COMPLETED").length;
  const paidTotal = summary.payments
    .filter((payment) => payment.status === "SUCCESSFUL")
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);
  const latestBookings = [...summary.bookings].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 4);
  const latestServiceOrder = summary.serviceOrders[0];

  const cards = [
    { to: "/dashboard/bookings", icon: "bookings", title: "My bookings", desc: "View and manage reservations" },
    { to: "/dashboard/payments", icon: "payments", title: "Payment history", desc: "See receipts and transaction status" },
    { to: "/dashboard/notifications", icon: "notifications", title: "Notifications", desc: "Booking and payment alerts" },
    { to: "/dashboard/profile", icon: "profile", title: "My profile", desc: "Update your personal information" },
    { to: "/services", icon: "car", title: "Request a service", desc: "Arrange a transfer, driver or trip service" },
    { to: "/cars", icon: "car", title: "Find a car", desc: "Browse the fleet" }
  ];

  return (
    <section className="section workspace-page customer-workspace">
      <div className="workspace-heading"><div><p className="eyebrow">CUSTOMER WORKSPACE</p><h1>Welcome back, {name.split(" ")[0]}</h1><p className="section-lede">A clear view of your travel plans, account and requests.</p></div><Link className="btn" to="/cars">Find a car ↗</Link></div>
      {error && <div className="alert">Some account information could not be loaded. Refresh to try again.</div>}
      <div className="metric-grid" aria-label="Account overview">
        <article className="metric-card"><span>Bookings</span><strong>{summary.bookings.length}</strong><small>All reservations</small></article>
        <article className="metric-card"><span>Upcoming</span><strong>{upcomingCount}</strong><small>Pending or confirmed</small></article>
        <article className="metric-card"><span>Completed trips</span><strong>{completedCount}</strong><small>Finished rentals</small></article>
        <article className="metric-card"><span>Successful payments</span><strong>{paidTotal.toLocaleString()}</strong><small>FCFA recorded</small></article>
      </div>
      <div className="workspace-columns">
        <section className="workspace-panel">
          <div className="workspace-panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Your bookings</h2></div><Link to="/dashboard/bookings">All bookings ↗</Link></div>
          {latestBookings.length ? <div className="activity-list">{latestBookings.map((booking) => <article key={booking.bookingId}><span className="activity-icon"><Icon name="car" /></span><div className="activity-main"><strong>{booking.carName || booking.carId}</strong><small>{booking.pickupDate || "Date pending"} · {booking.pickupLocation || "Pickup to confirm"}</small></div><span className={`status-pill status-${String(booking.status).toLowerCase()}`}>{booking.status}</span></article>)}</div> : <div className="workspace-empty"><p>No bookings yet.</p><Link to="/cars">Explore available cars ↗</Link></div>}
        </section>
        <aside className="workspace-panel service-status-panel"><div className="workspace-panel-heading"><div><p className="eyebrow">SERVICE DESK</p><h2>Service requests</h2></div><Link to="/services">New request ↗</Link></div>{latestServiceOrder ? <div className="latest-request"><span className="status-pill">{latestServiceOrder.status}</span><h3>{latestServiceOrder.serviceTitle}</h3><p>{latestServiceOrder.pickupLocation}{latestServiceOrder.requestedDate ? ` · ${latestServiceOrder.requestedDate}` : ""}</p><small>Submitted {new Date(latestServiceOrder.createdAt).toLocaleDateString()}</small></div> : <div className="workspace-empty"><p>Need a transfer, rental or driver?</p><Link to="/services">Explore six travel services ↗</Link></div>}<Link className="subtle-action" to="/services">View request history and services <span>↗</span></Link></aside>
      </div>
      <section className="workspace-actions"><div><p className="eyebrow">QUICK ACCESS</p><h2>Manage your account</h2></div><div className="workspace-action-grid">{cards.map((card) => <Link className="workspace-action" key={card.to} to={card.to}><Icon name={card.icon} /><span><strong>{card.title}</strong><small>{card.desc}</small></span><b aria-hidden="true">↗</b></Link>)}</div></section>
    </section>
  );
}
