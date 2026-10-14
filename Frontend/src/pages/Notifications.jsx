import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const data = await api.getNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setMessage(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id) {
    try {
      await api.markNotificationRead(id);
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  async function remove(id) {
    try {
      await api.deleteNotification(id);
      await load();
    } catch (e) {
      setMessage(e.message);
    }
  }

  return (
    <section className="section">
      <p className="eyebrow">ACCOUNT</p>
      <h1>Notifications</h1>
      {message && <div className="alert error">{message}</div>}
      {items.length === 0 && <div className="empty">No notifications yet.</div>}
      <ul className="review-list">
        {items.map((n) => (
          <li key={n.notificationId} className={n.read ? "" : "unread"}>
            <strong>{n.title}</strong> <span className="badge">{n.type}</span>
            <p>{n.message}</p>
            <small>{new Date(n.createdAt).toLocaleString()}</small>{" "}
            {!n.read && (
              <button className="btn btn-small" onClick={() => markRead(n.notificationId)}>Mark read</button>
            )}{" "}
            <button className="btn btn-small danger-btn" onClick={() => remove(n.notificationId)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}