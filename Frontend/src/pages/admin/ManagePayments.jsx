import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function ManagePayments() {
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

  async function refund(p) {
    if (!confirm(`Refund ${Number(p.amount).toLocaleString()} ${p.currency} for ${p.paymentId}?`)) return;
    try {
      await api.refundPayment(p.paymentId);
      setMessage(`Payment ${p.paymentId} refunded.`);
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  return (
    <section className="section">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Manage payments</h1>
      {message && <div className="alert">{message}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Payment</th>
              <th>User</th>
              <th>Booking</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.paymentId}>
                <td>{p.paymentId}</td>
                <td>{p.userEmail || p.userId}</td>
                <td>{p.bookingId}</td>
                <td>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</td>
                <td>{Number(p.amount || 0).toLocaleString()} {p.currency || "XAF"}</td>
                <td>{p.method}</td>
                <td>{p.transactionRef}</td>
                <td><span className="badge">{p.status}</span></td>
                <td>
                  {p.status === "SUCCESSFUL" && (
                    <button className="btn btn-small danger-btn" onClick={() => refund(p)}>Refund</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}