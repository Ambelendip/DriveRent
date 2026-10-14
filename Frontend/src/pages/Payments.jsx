import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api.getPayments();
      setPayments(Array.isArray(data) ? data : []);
    } catch (e) {
      setMessage(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="section">
      <p className="eyebrow">ACCOUNT</p>
      <h1>Payment history</h1>
      {message && <div className="alert error">{message}</div>}
      {payments.length === 0 && <div className="empty">No payments yet.</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payment</th>
              <th>Booking</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.paymentId}>
                <td>{p.paymentId}</td>
                <td>{p.bookingId}</td>
                <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</td>
                <td>{Number(p.amount || 0).toLocaleString()} {p.currency || "XAF"}</td>
                <td>{p.method}</td>
                <td>{p.transactionRef}</td>
                <td><span className="badge">{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}