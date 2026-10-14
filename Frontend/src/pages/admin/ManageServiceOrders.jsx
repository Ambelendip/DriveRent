import { useEffect, useState } from "react";
import { api } from "../../services/api";

const statuses = ["NEW", "CONTACTED", "CONFIRMED", "COMPLETED", "CANCELLED"];

export default function ManageServiceOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    const data = await api.getServiceOrders();
    setOrders(Array.isArray(data) ? data : []);
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function update(order, status) {
    setError("");
    setMessage("");
    setUpdatingId(order.orderId);
    try {
      await api.updateServiceOrder(order.orderId, { status });
      setMessage(`Request ${order.orderId} updated.`);
      await load();
    } catch (err) { setError(err.message); }
    finally { setUpdatingId(null); }
  }

  async function approve(order) {
    await update(order, "CONFIRMED");
  }

  return (
    <section className="section">
      <div className="section-heading"><div><p className="eyebrow">ADMINISTRATION · SERVICE DESK</p><h1>Service requests</h1><p className="section-lede">Review requests submitted by customers and update their progress.</p></div></div>
      {error && <div className="alert error">{error}</div>}{message && <div className="alert">{message}</div>}
      {orders.length === 0 ? <div className="empty">No service requests yet.</div> : <div className="service-order-list">{orders.map((order) => <article key={order.orderId}><div className="order-main"><div className="content-card-meta"><span>{order.orderId}</span><span className="badge">{order.status}</span></div><h2>{order.serviceTitle}</h2><p>{order.userEmail} · {order.contactPhone}</p><p>{order.pickupLocation || "Location not provided"}{order.requestedDate ? ` · Preferred ${order.requestedDate}` : ""}</p>{order.details && <p className="order-details">{order.details}</p>}</div><div className="order-actions"><small>Received {new Date(order.createdAt).toLocaleString()}</small>{order.status === "NEW" && <button className="btn btn-small" disabled={updatingId === order.orderId} onClick={() => approve(order)}>{updatingId === order.orderId ? "Approving..." : "Approve request"}</button>}<label>Update status<select disabled={updatingId === order.orderId} value={order.status} onChange={(event) => update(order, event.target.value)}>{statuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></label></div></article>)}</div>}
    </section>
  );
}
