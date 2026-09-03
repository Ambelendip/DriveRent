import { useEffect, useState } from "react";
import { api } from "../services/api";
import Loader from "../components/Loader";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const data = await api.getBookings();
      setBookings(Array.isArray(data) ? data : data?.bookings || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function cancel(id) {
    if (!confirm("Cancel this booking?")) return;
    try { await api.cancelBooking(id); await load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <section className="section">
      <p className="eyebrow">CUSTOMER AREA</p><h1>My bookings</h1>
      {loading && <Loader />}
      {error && <div className="alert error">{error}</div>}
      {!loading && bookings.length === 0 && <div className="empty">You have no bookings yet.</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Car</th><th>Dates</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {bookings.map(b => <tr key={b.bookingId}>
              <td>{b.bookingId}</td>
              <td>{b.carName || b.carId}</td>
              <td>{b.pickupDate} → {b.returnDate}</td>
              <td>{Number(b.totalPrice || 0).toLocaleString()} FCFA</td>
              <td><span className="badge">{b.status}</span></td>
              <td>{["PENDING","CONFIRMED"].includes(b.status) && <button className="btn btn-small danger-btn" onClick={()=>cancel(b.bookingId)}>Cancel</button>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}