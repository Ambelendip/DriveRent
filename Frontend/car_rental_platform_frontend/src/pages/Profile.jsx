import { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { profile, refresh } = useAuth();
  const [form, setForm] = useState({ name:"", phone:"", location:"", bio:"" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (profile) setForm({
      name: profile.name || "", phone: profile.phone || "",
      location: profile.location || "", bio: profile.bio || ""
    });
  }, [profile]);

  async function submit(e) {
    e.preventDefault(); setMessage("");
    try {
      await api.updateProfile(form);
      await refresh();
      setMessage("Profile updated.");
    } catch (e) { setMessage(e.message); }
  }

  return (
    <section className="section narrow">
      <p className="eyebrow">ACCOUNT</p><h1>My profile</h1>
      <form className="form-card" onSubmit={submit}>
        <label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
        <label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
        <label>Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
        <label>Bio<textarea rows="4" value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label>
        {message && <div className="alert">{message}</div>}
        <button className="btn">Save changes</button>
      </form>
    </section>
  );
}