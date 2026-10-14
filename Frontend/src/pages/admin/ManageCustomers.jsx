import { useEffect, useState } from "react";
import { api } from "../../services/api";

export default function ManageCustomers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api.listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      setMessage(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(user, status) {
    if (!confirm(`${status === "SUSPENDED" ? "Suspend" : "Reactivate"} ${user.email}?`)) return;
    try {
      await api.updateUser(user.userId, { accountStatus: status });
      setMessage(`${user.email} ${status === "SUSPENDED" ? "suspended" : "activated"}.`);
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.userId || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="section">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Manage customers</h1>
      {message && <div className="alert">{message}</div>}
      <div className="filters">
        <input placeholder="Search name, email or ID" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>City / Country</th>
              <th>Registered</th>
              <th>Bookings</th>
              <th>Completed</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.userId}>
                <td>{u.name || u.firstName || u.userId}</td>
                <td>{u.email}</td>
                <td>{[u.city, u.country].filter(Boolean).join(", ") || "-"}</td>
                <td>{u.registrationDate ? new Date(u.registrationDate).toLocaleDateString() : "-"}</td>
                <td>{u.totalBookings ?? 0}</td>
                <td>{u.completedRentals ?? 0}</td>
                <td>
                  <span className="badge">{u.accountStatus || "ACTIVE"}</span>
                </td>
                <td>
                  {(u.accountStatus || "ACTIVE") === "ACTIVE" ? (
                    <button className="btn btn-small danger-btn" onClick={() => setStatus(u, "SUSPENDED")}>Suspend</button>
                  ) : (
                    <button className="btn btn-small" onClick={() => setStatus(u, "ACTIVE")}>Reactivate</button>
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