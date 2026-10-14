import { useEffect, useState } from "react";
import { api } from "../services/api";
import Loader from "../components/Loader";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ pickupDate: "", returnDate: "", pickupLocation: "", returnLocation: "" });
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api.getBookings();
      setBookings(Array.isArray(data) ? data : data?.bookings || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function pay(id, method) {
    setPayingId(id);
    setMessage("");
    try {
      await api.createPayment({ bookingId: id, method });
      setMessage(`Payment completed for ${id}. Booking confirmed.`);
      await load();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setPayingId(null);
    }
  }

  async function cancel(id) {
    if (!confirm("Cancel this booking?")) return;
    try {
      await api.cancelBooking(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(b) {
    setEditing(b.bookingId);
    setEditForm({
      pickupDate: b.pickupDate || "",
      returnDate: b.returnDate || "",
      pickupLocation: b.pickupLocation || "",
      returnLocation: b.returnLocation || ""
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.updateBooking(editing, editForm);
      setEditing(null);
      await load();
      setMessage("Booking updated.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  const upcoming = bookings.filter((b) => ["PENDING", "CONFIRMED"].includes(b.status));
  const current = bookings.filter((b) => b.status === "ACTIVE");
  const past = bookings.filter((b) => ["COMPLETED", "CANCELLED", "NO-SHOW", "REJECTED"].includes(b.status));

  const renderRow = (b) => (
    <tr key={b.bookingId}>
      <td>{b.bookingId}</td>
      <td>{b.carName || b.carId}</td>
      <td>
        {b.pickupLocation || "-"} → {b.returnLocation || "-"}
        <br />
        <small>{b.pickupDate || "-"}{b.pickupTime ? ` ${b.pickupTime}` : ""} → {b.returnDate || "-"}{b.returnTime ? ` ${b.returnTime}` : ""}</small>
      </td>
      <td>
        {Number(b.totalPrice || b.totalAmount || 0).toLocaleString()} FCFA
        <small>
          <br />
          {b.deposit ? `deposit ${Number(b.deposit).toLocaleString()}` : ""}
          {b.discount ? ` · -${Number(b.discount).toLocaleString()}` : ""}
        </small>
      </td>
      <td>
        <span className="badge">{b.status}</span>{" "}
        <span className="badge">{b.paymentStatus || "UNPAID"}</span>
      </td>
      <td className="button-row">
        {b.status === "PENDING" && !b.paymentId && (
          <>
            <button className="btn btn-small" disabled={payingId === b.bookingId} onClick={() => pay(b.bookingId, "CARD")}>
              {payingId === b.bookingId ? "Paying..." : "Pay (card)"}
            </button>
            <button className="btn btn-small" disabled={payingId === b.bookingId} onClick={() => pay(b.bookingId, "MOBILE_MONEY")}>
              Mobile money
            </button>
            {editing === b.bookingId ? (
              <button className="btn btn-small" onClick={() => setEditing(null)}>Cancel edit</button>
            ) : (
              <button className="btn btn-small" onClick={() => startEdit(b)}>Modify</button>
            )}
          </>
        )}
        {["PENDING", "CONFIRMED"].includes(b.status) && (
          <button className="btn btn-small danger-btn" onClick={() => cancel(b.bookingId)}>Cancel</button>
        )}
      </td>
    </tr>
  );

  return (
    <section className="section">
      <p className="eyebrow">CUSTOMER AREA</p>
      <h1>My bookings</h1>
      {loading && <Loader />}
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert">{message}</div>}

      {editing && (
        <form className="form-card" onSubmit={saveEdit}>
          <h3>Modify booking {editing}</h3>
          <div className="form-grid">
            <label>Pickup date<input type="date" required value={editForm.pickupDate} onChange={(e) => setEditForm({ ...editForm, pickupDate: e.target.value })} /></label>
            <label>Return date<input type="date" required value={editForm.returnDate} onChange={(e) => setEditForm({ ...editForm, returnDate: e.target.value })} /></label>
            <label>Pickup location<input value={editForm.pickupLocation} onChange={(e) => setEditForm({ ...editForm, pickupLocation: e.target.value })} /></label>
            <label>Return location<input value={editForm.returnLocation} onChange={(e) => setEditForm({ ...editForm, returnLocation: e.target.value })} /></label>
          </div>
          <button className="btn">Save changes</button>
        </form>
      )}

      {!loading && bookings.length === 0 && <div className="empty">You have no bookings yet.</div>}

      {upcoming.length > 0 && (
        <>
          <h3>Upcoming</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Booking</th><th>Car</th><th>Locations / dates</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>{upcoming.map(renderRow)}</tbody>
            </table>
          </div>
        </>
      )}

      {current.length > 0 && (
        <>
          <h3>Current rental</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Booking</th><th>Car</th><th>Locations / dates</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>{current.map(renderRow)}</tbody>
            </table>
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <h3>Past bookings</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Booking</th><th>Car</th><th>Locations / dates</th><th>Total</th><th>Status</th><th></th></tr></thead>
              <tbody>{past.map(renderRow)}</tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}