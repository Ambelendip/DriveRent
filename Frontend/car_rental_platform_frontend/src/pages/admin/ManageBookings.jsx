import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function ManageBookings() {
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api.getBookings();
    setBookings(Array.isArray(data) ? data : data?.bookings || []);
  }
  useEffect(()=>{ load().catch(e=>setMessage(e.message)); }, []);

  async function update(id, status) {
    try { await api.updateBooking(id, {status}); await load(); }
    catch(e) { setMessage(e.message); }
  }

  return (
    <section className="section">
      <p className="eyebrow">ADMINISTRATION</p><h1>Manage bookings</h1>
      {message && <div className="alert error">{message}</div>}
      <div className="table-wrap">
        <table><thead><tr><th>Booking</th><th>User</th><th>Car</th><th>Dates</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{bookings.map(b=><tr key={b.bookingId}>
          <td>{b.bookingId}</td><td>{b.userId}</td><td>{b.carId}</td>
          <td>{b.pickupDate} → {b.returnDate}</td>
          <td>{Number(b.totalPrice||0).toLocaleString()} FCFA</td>
          <td><span className="badge">{b.status}</span></td>
          <td className="button-row">
            {b.status === "PENDING" && <>
              <button className="btn btn-small" onClick={()=>update(b.bookingId,"CONFIRMED")}>Approve</button>
              <button className="btn btn-small danger-btn" onClick={()=>update(b.bookingId,"REJECTED")}>Reject</button>
            </>}
            {b.status === "CONFIRMED" && <button className="btn btn-small" onClick={()=>update(b.bookingId,"ACTIVE")}>Start</button>}
            {b.status === "ACTIVE" && <button className="btn btn-small" onClick={()=>update(b.bookingId,"COMPLETED")}>Complete</button>}
          </td>
        </tr>)}</tbody></table>
      </div>
    </section>
  );
}