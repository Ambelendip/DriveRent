import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

export default function Register() {
  const { register, confirm, login } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState("register");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    dateOfBirth: "",
    address: "",
    city: "",
    country: ""
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      setStage("confirm");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await confirm(form.email, code);
      await login(form.email, form.password);
      // Persist extended profile fields after first login
      try {
        await api.updateProfile({
          name: form.name,
          dateOfBirth: form.dateOfBirth,
          address: form.address,
          city: form.city,
          country: form.country
        });
      } catch {
        // Profile persistence is best-effort; account still works
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={stage === "register" ? submit : verify}>
        <p className="eyebrow">{stage === "register" ? "CREATE ACCOUNT" : "VERIFY EMAIL"}</p>
        <h1>{stage === "register" ? "Join DriveRent" : "Enter verification code"}</h1>
        {error && <div className="alert error">{error}</div>}
        {stage === "register" ? (
          <>
            <label>Full name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label>Phone<input placeholder="+237..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Date of birth<input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></label>
            <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
            <div className="form-grid">
              <label>City<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
              <label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
            </div>
            <label>Password<input type="password" required minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <button className="btn full" disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
          </>
        ) : (
          <>
            <p className="muted">A verification code was sent to {form.email}.</p>
            <label>Verification code<input required value={code} onChange={(e) => setCode(e.target.value)} /></label>
            <button className="btn full" disabled={loading}>{loading ? "Verifying..." : "Verify account"}</button>
          </>
        )}
        <p className="muted">Already registered? <Link to="/login">Sign in</Link></p>
      </form>
    </section>
  );
}