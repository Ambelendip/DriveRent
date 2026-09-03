import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || "/dashboard");
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">WELCOME BACK</p><h1>Sign in</h1>
        {error && <div className="alert error">{error}</div>}
        <label>Email<input type="email" required value={form.email} onChange={e => setForm({...form, email:e.target.value})}/></label>
        <label>Password<input type="password" required value={form.password} onChange={e => setForm({...form, password:e.target.value})}/></label>
        <button className="btn full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        <p className="muted">Don't have an account? <Link to="/register">Create one</Link></p>
      </form>
    </section>
  );
}