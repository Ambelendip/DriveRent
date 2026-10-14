import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../services/auth";

export default function Profile() {
  const { profile, refresh } = useAuth();
  const [form, setForm] = useState({
    name: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    city: "",
    country: "",
    location: "",
    bio: ""
  });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [message, setMessage] = useState("");
  const [pwMessage, setPwMessage] = useState("");

  useEffect(() => {
    if (profile)
      setForm({
        name: profile.name || "",
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        address: profile.address || "",
        city: profile.city || "",
        country: profile.country || "",
        location: profile.location || "",
        bio: profile.bio || ""
      });
  }, [profile]);

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.updateProfile(form);
      await refresh();
      setMessage("Profile updated.");
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function changePw(e) {
    e.preventDefault();
    setPwMessage("");
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: "", next: "" });
      setPwMessage("Password changed successfully.");
    } catch (err) {
      setPwMessage(err.message);
    }
  }

  if (!profile) return <div className="center-page">Loading...</div>;

  return (
    <section className="section">
      <p className="eyebrow">ACCOUNT</p>
      <h1>My profile</h1>

      <div className="dashboard-grid">
        <div className="dashboard-card plain">
          <strong>Member since</strong>
          <span>{profile.registrationDate ? new Date(profile.registrationDate).toLocaleDateString() : "-"}</span>
        </div>
        <div className="dashboard-card plain">
          <strong>Total bookings</strong>
          <span>{profile.totalBookings ?? 0}</span>
        </div>
        <div className="dashboard-card plain">
          <strong>Completed rentals</strong>
          <span>{profile.completedRentals ?? 0}</span>
        </div>
        <div className="dashboard-card plain">
          <strong>Account status</strong>
          <span>{profile.accountStatus || "ACTIVE"}</span>
        </div>
      </div>

      <form className="form-card" onSubmit={submit}>
        <h3>Personal information</h3>
        <div className="form-grid">
          <label>First name<input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
          <label>Last name<input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
          <label>Display name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Date of birth<input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></label>
          <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
          <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
          <label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
        </div>
        <label>Bio<textarea rows="3" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        {message && <div className="alert">{message}</div>}
        <button className="btn">Save changes</button>
      </form>

      <form className="form-card" onSubmit={changePw}>
        <h3>Change password</h3>
        <label>Current password<input type="password" required value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></label>
        <label>New password<input type="password" required minLength="8" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
        {pwMessage && <div className="alert">{pwMessage}</div>}
        <button className="btn">Update password</button>
      </form>
    </section>
  );
}