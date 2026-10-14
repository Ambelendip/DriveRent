import { useEffect, useState } from "react";
import { api, uploadToS3 } from "../../services/api";

const emptyForm = { type: "POST", title: "", summary: "", body: "", imageUrl: "", imageAlt: "", startDate: "", endDate: "", location: "", carId: "", percentOff: "", serviceKey: "", priceFrom: "", published: false, featured: false };
const contentTypes = [
  ["POST", "Post"],
  ["EVENT", "Event"],
  ["DISCOUNT", "Car discount"],
  ["SERVICE", "Service"],
];

export default function ManageContent() {
  const [items, setItems] = useState([]);
  const [cars, setCars] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [content, fleet] = await Promise.all([api.getContent(), api.getCars()]);
    setItems(Array.isArray(content) ? content : []);
    setCars(Array.isArray(fleet) ? fleet : []);
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  function reset() {
    setForm(emptyForm);
    setEditingId(null);
    setImageFile(null);
    setPreview("");
  }

  function edit(item) {
    setEditingId(item.contentId);
    setForm({ ...emptyForm, ...item, startDate: item.startDate?.slice(0, 10) || "", endDate: item.endDate?.slice(0, 10) || "" });
    setImageFile(null);
    setPreview(item.imageUrl || "");
    document.getElementById("content-editor")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let imageUrl = form.imageUrl;
      if (imageFile) {
        const upload = await api.createUploadUrl({ fileName: imageFile.name, contentType: imageFile.type || "image/jpeg", folder: "content" });
        await uploadToS3(upload.uploadUrl || upload.url, imageFile);
        imageUrl = upload.fileUrl || upload.publicUrl || upload.objectUrl;
      }
      const payload = { ...form, imageUrl, percentOff: form.percentOff === "" ? undefined : Number(form.percentOff), priceFrom: form.priceFrom === "" ? undefined : Number(form.priceFrom), startDate: form.startDate || undefined, endDate: form.endDate || undefined };
      if (editingId) await api.updateContent(editingId, payload);
      else await api.createContent(payload);
      reset();
      await load();
      setMessage("Content saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try {
      await api.deleteContent(item.contentId);
      await load();
      setMessage("Content deleted.");
    } catch (err) { setError(err.message); }
  }

  async function togglePublished(item) {
    try {
      await api.updateContent(item.contentId, { published: !item.published });
      await load();
    } catch (err) { setError(err.message); }
  }

  const visible = items.filter((item) => filter === "ALL" || item.type === filter);

  return (
    <section className="section admin-content-page">
      <div className="section-heading"><div><p className="eyebrow">ADMINISTRATION · PUBLISHING</p><h1>Content, offers & services</h1><p className="section-lede">Create photo posts, events, car discounts and bookable services for the public site.</p></div><a className="btn secondary" href="/admin/service-orders">Service requests ↗</a></div>
      {error && <div className="alert error">{error}</div>}{message && <div className="alert">{message}</div>}

      <form className="form-card content-editor" id="content-editor" onSubmit={submit}>
        <div className="content-editor-heading"><div><p className="eyebrow">{editingId ? "UPDATE ENTRY" : "NEW ENTRY"}</p><h2>{editingId ? "Edit published content" : "Create something for the site"}</h2></div><label className="publish-toggle"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} /> Published</label></div>
        <div className="form-grid"><label>Content type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{contentTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Title *<input required maxLength="160" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label></div>
        <label>Short description *<textarea required maxLength="600" rows="2" value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></label>
        <label>Full text<textarea maxLength="12000" rows="5" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Optional details for the post, event or service" /></label>
        <div className="content-image-control"><label>Image<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0] || null; setImageFile(file); setPreview(file ? URL.createObjectURL(file) : form.imageUrl); }} /></label>{preview && <div className="content-image-preview"><img src={preview} alt="Content preview" /><button type="button" className="btn btn-small secondary" onClick={() => { setImageFile(null); setPreview(""); setForm({ ...form, imageUrl: "" }); }}>Remove image</button></div>}</div>
        {form.imageUrl && !imageFile && <label>Image URL<input value={form.imageUrl} onChange={(event) => { setForm({ ...form, imageUrl: event.target.value }); setPreview(event.target.value); }} /></label>}
        {form.type === "EVENT" && <div className="form-grid"><label>Start date<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label>End date<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label><label>Location<input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label></div>}
        {form.type === "DISCOUNT" && <div className="form-grid"><label>Car *<select required value={form.carId} onChange={(event) => setForm({ ...form, carId: event.target.value })}><option value="">Choose a car</option>{cars.map((car) => <option value={car.carId} key={car.carId}>{car.brand} {car.model} · {car.location}</option>)}</select></label><label>Discount (%) *<input type="number" required min="0.01" max="100" step="0.01" value={form.percentOff} onChange={(event) => setForm({ ...form, percentOff: event.target.value })} /></label><label>Starts<input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></label><label>Ends<input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label></div>}
        {form.type === "SERVICE" && <div className="form-grid"><label>Service key<input value={form.serviceKey} onChange={(event) => setForm({ ...form, serviceKey: event.target.value })} placeholder="airport-transfer" /></label><label>Starting price (FCFA)<input type="number" min="0" value={form.priceFrom} onChange={(event) => setForm({ ...form, priceFrom: event.target.value })} /></label></div>}
        {form.type === "POST" && <label>URL slug<input value={form.slug || ""} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="Optional, for future shareable post pages" /></label>}
        <div className="button-row"><button className="btn" disabled={busy}>{busy ? "Saving..." : editingId ? "Save changes" : "Create entry"}</button>{editingId && <button className="btn secondary" type="button" onClick={reset}>Cancel edit</button>}</div>
      </form>

      <div className="content-list-heading"><div><p className="eyebrow">CONTENT LIBRARY</p><h2>Manage entries</h2></div><label>Show<select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">All types</option>{contentTypes.map(([type, title]) => <option value={type} key={type}>{title}</option>)}</select></label></div>
      <div className="admin-content-grid">{visible.map((item) => <article className="admin-content-card" key={item.contentId}>{item.imageUrl && <img src={item.imageUrl} alt={item.imageAlt || ""} />}<div className="admin-content-copy"><div className="content-card-meta"><span>{item.type}</span><span className={item.published ? "status-live" : "status-draft"}>{item.published ? "LIVE" : "DRAFT"}</span></div><h3>{item.title}</h3><p>{item.summary}</p>{item.type === "DISCOUNT" && <p className="content-detail">{item.percentOff}% off · {cars.find((car) => car.carId === item.carId)?.brand || "Car"} {cars.find((car) => car.carId === item.carId)?.model || ""}</p>}{item.type === "SERVICE" && item.priceFrom != null && <p className="content-detail">From {Number(item.priceFrom).toLocaleString()} FCFA</p>}<div className="button-row"><button className="btn btn-small" onClick={() => edit(item)}>Edit</button><button className="btn btn-small secondary" onClick={() => togglePublished(item)}>{item.published ? "Unpublish" : "Publish"}</button><button className="btn btn-small danger-btn" onClick={() => remove(item)}>Delete</button></div></div></article>)}{visible.length === 0 && <div className="empty">No entries yet. Create a post, event, discount or service above.</div>}</div>
    </section>
  );
}
