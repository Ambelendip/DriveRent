import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { pickupCities, serviceCatalog } from "../services/serviceCatalog";

const emptyForm = { serviceId: "", contactPhone: "", requestedDate: "", pickupLocation: "", details: "" };

export default function Services() {
  const { user } = useAuth();
  const location = useLocation();
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [serviceData, orderData] = await Promise.all([
      api.getContent("SERVICE"),
      user ? api.getServiceOrders() : Promise.resolve([])
    ]);
    setServices(Array.isArray(serviceData) ? serviceData : []);
    setOrders(Array.isArray(orderData) ? orderData : []);
  }

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([api.getContent("SERVICE"), user ? api.getServiceOrders() : Promise.resolve([])])
      .then(([serviceResult, orderResult]) => {
        if (!mounted) return;
        setServices(serviceResult.status === "fulfilled" && Array.isArray(serviceResult.value) ? serviceResult.value : []);
        if (orderResult.status === "fulfilled" && Array.isArray(orderResult.value)) setOrders(orderResult.value);
        else if (user) setError(orderResult.reason?.message || "Could not load your service requests.");
      })
      .catch((err) => { if (mounted) setError(err.message); });
    return () => { mounted = false; };
  }, [user]);

  const selectableServices = [
    ...serviceCatalog,
    ...services
      .filter((service) => !serviceCatalog.some((builtIn) => builtIn.id === service.serviceKey))
      .map((service) => ({ id: service.contentId, title: service.title, summary: service.summary, imageUrl: service.imageUrl, imageAlt: service.imageAlt, priceFrom: service.priceFrom }))
  ];

  function selectService(serviceId) {
    setForm((current) => ({ ...current, serviceId }));
    document.getElementById("service-request")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.createServiceOrder(form);
      setForm(emptyForm);
      setMessage("Your request has been sent. We’ll follow up with you.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section services-page">
      <div className="services-heading"><p className="eyebrow">PLAN THE WHOLE JOURNEY</p><h1>Services for the way you travel.</h1><p>Pick what you need and send a request. We’ll confirm availability, timing and pricing with you.</p></div>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert">{message}</div>}
      <div className="service-catalog">{selectableServices.map((service, index) => <article className="catalog-service" key={service.id}>{service.imageUrl && <img src={service.imageUrl} alt={service.imageAlt || ""} />}<div className="catalog-service-copy"><span className="service-index">0{index + 1} / SERVICE</span><h2>{service.title}</h2><p>{service.summary}</p>{service.priceFrom != null && <p className="service-price">From {Number(service.priceFrom).toLocaleString()} FCFA</p>}{user?.role !== "ADMIN" && <button type="button" className="btn" onClick={() => selectService(service.id)}>Request this service ↗</button>}</div></article>)}</div>

      <div className="service-request-layout" id="service-request">
        <div className="service-request-intro"><p className="eyebrow">{user?.role === "ADMIN" ? "SERVICE DESK" : "TELL US WHAT YOU NEED"}</p><h2>{user?.role === "ADMIN" ? "Review customer requests." : "Make a service request."}</h2><p>{user?.role === "ADMIN" ? "Administrators review and approve customer requests from the service queue." : "Share a few details and we’ll get back to you to confirm your plans."}</p></div>
        {user?.role === "ADMIN" ? <div className="form-card service-signin"><p>Customer requests are managed from the service desk. Review incoming requests and update their status there.</p><Link className="btn" to="/admin/service-orders">Open service request queue ↗</Link></div> : user ? <form className="form-card service-request-form" onSubmit={submit}><label>Service<select required value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}><option value="">Choose a service</option>{selectableServices.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}</select></label><div className="form-grid"><label>Contact phone<input required value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} placeholder="+237 ..." /><small>We’ll use this number to confirm your request.</small></label><label>Preferred date<input type="date" value={form.requestedDate} onChange={(event) => setForm({ ...form, requestedDate: event.target.value })} /></label></div><label>Pickup city<select required value={form.pickupLocation} onChange={(event) => setForm({ ...form, pickupLocation: event.target.value })}><option value="">Choose a city</option>{pickupCities.map((city) => <option key={city} value={city}>{city}</option>)}</select></label><label>Trip details<textarea rows="4" maxLength="2000" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="Arrival time, group size, route, or anything we should know" /></label><button className="btn" disabled={saving}>{saving ? "Sending request..." : "Send request ↗"}</button></form> : <div className="form-card service-signin"><p>Sign in to request a service and track its status from your account.</p><Link className="btn" to="/login" state={{ from: location.pathname }}>Sign in to continue</Link></div>}
      </div>

      {user && user.role !== "ADMIN" && <section className="service-orders-section"><div className="section-heading"><div><p className="eyebrow">YOUR REQUESTS</p><h2>Service request status</h2></div></div>{orders.length ? <div className="service-order-list">{orders.map((order) => <article key={order.orderId}><div><span className="badge">{order.status}</span><h3>{order.serviceTitle}</h3><p>{order.pickupLocation || "Location to be confirmed"}{order.requestedDate ? ` · ${order.requestedDate}` : ""}</p></div><small>{new Date(order.createdAt).toLocaleDateString()}</small></article>)}</div> : <p className="muted">You haven’t sent any service requests yet.</p>}</section>}
    </section>
  );
}
