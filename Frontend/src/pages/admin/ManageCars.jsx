import { useEffect, useState } from "react";
import { api, uploadToS3 } from "../../services/api";
import { config } from "../../config";

const empty = {
  brand: "",
  model: "",
  year: "",
  type: "SEDAN",
  transmission: "AUTOMATIC",
  fuelType: "PETROL",
  seats: 5,
  pricePerDay: "",
  location: "",
  description: "",
  available: true,
  imageUrls: []
};

export default function ManageCars() {
  const [cars, setCars] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await api.getCars();
    setCars(Array.isArray(data) ? data : data?.cars || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  function edit(car) {
    setEditing(car.carId);
    setForm({ ...empty, ...car, imageUrls: car.imageUrls || [] });
    setFiles([]);
    setPreviews([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm(empty);
    setEditing(null);
    setFiles([]);
    setPreviews([]);
  }

  function onFilesSelected(e) {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setFiles((prev) => [...prev, ...selected]);
    const newPreviews = selected.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  }

  function removePendingImage(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingImage(url) {
    setForm((prev) => ({
      ...prev,
      imageUrls: (prev.imageUrls || []).filter((u) => u !== url)
    }));
  }

  async function uploadPendingImages() {
    const uploaded = [];
    for (const file of files) {
      const upload = await api.createUploadUrl({
        fileName: file.name,
        contentType: file.type || "image/jpeg",
        folder: config.uploadPath
      });
      await uploadToS3(upload.uploadUrl || upload.url, file);
      uploaded.push(upload.fileUrl || upload.publicUrl || upload.objectUrl);
    }
    return uploaded;
  }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setError("");
    setUploading(true);
    try {
      let imageUrls = form.imageUrls || [];
      if (files.length) {
        const uploaded = await uploadPendingImages();
        imageUrls = [...imageUrls, ...uploaded];
      }

      const payload = {
        ...form,
        year: Number(form.year),
        seats: Number(form.seats),
        pricePerDay: Number(form.pricePerDay),
        imageUrls
      };

      if (editing) await api.updateCar(editing, payload);
      else await api.createCar(payload);

      resetForm();
      await load();
      setMessage("Car saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this car?")) return;
    try {
      await api.deleteCar(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="section">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Manage cars</h1>
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert">{message}</div>}

      <form className="form-card" onSubmit={submit}>
        <h3>{editing ? `Edit car: ${form.brand} ${form.model}` : "Add a new car"}</h3>
        <div className="form-grid">
          <label>Brand *<input required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></label>
          <label>Model *<input required value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
          <label>Year *<input type="number" required min="1990" max="2030" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></label>
          <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="SEDAN">Sedan</option>
            <option value="SUV">SUV</option>
            <option value="HATCHBACK">Hatchback</option>
            <option value="VAN">Van</option>
            <option value="COUPE">Coupé</option>
            <option value="CONVERTIBLE">Convertible</option>
            <option value="PICKUP">Pickup</option>
          </select></label>
          <label>Transmission<select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value })}>
            <option value="AUTOMATIC">Automatic</option>
            <option value="MANUAL">Manual</option>
          </select></label>
          <label>Fuel type<select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>
            <option value="PETROL">Petrol</option>
            <option value="DIESEL">Diesel</option>
            <option value="ELECTRIC">Electric</option>
            <option value="HYBRID">Hybrid</option>
          </select></label>
          <label>Seats<input type="number" min="1" max="20" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} /></label>
          <label>Price per day (FCFA) *<input type="number" required min="0" value={form.pricePerDay} onChange={(e) => setForm({ ...form, pricePerDay: e.target.value })} /></label>
          <label>Location *<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label>Available<select value={form.available} onChange={(e) => setForm({ ...form, available: e.target.value === "true" })}>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select></label>
        </div>
        <label>Description<textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>

        <h4>Photos (upload from your PC)</h4>
        <div className="upload-row">
          <label className="btn upload-btn">
            <svg
              className="upload-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {files.length > 0 ? `Upload ${files.length} photo(s)` : "Upload from your PC"}
            <input type="file" accept="image/*" multiple onChange={onFilesSelected} hidden />
          </label>
          {files.length > 0 && (
            <button type="button" className="btn secondary" onClick={resetForm}>
              Clear selection
            </button>
          )}
        </div>
        <p className="muted">
          Select one or more images. They are uploaded to S3 when you save the car.
          The first photo becomes the listing's cover image.
        </p>

        {(previews.length > 0 || (form.imageUrls || []).length > 0) && (
          <div className="thumb-row">
            {previews.map((src, i) => (
              <div key={`p-${i}`} className="thumb-item">
                <img src={src} alt={`New ${i + 1}`} />
                <button type="button" className="btn btn-small danger-btn" onClick={() => removePendingImage(i)}>Remove</button>
              </div>
            ))}
            {(form.imageUrls || []).map((url, i) => (
              <div key={`e-${i}`} className="thumb-item">
                <img src={url} alt={`Existing ${i + 1}`} />
                <button type="button" className="btn btn-small danger-btn" onClick={() => removeExistingImage(url)}>Remove</button>
              </div>
            ))}
          </div>
        )}

        <div className="button-row">
          <button className="btn" disabled={uploading}>
            {uploading ? "Uploading & saving..." : editing ? "Update car" : "Add car"}
          </button>
          {editing && (
            <button type="button" className="btn secondary" onClick={resetForm}>Cancel</button>
          )}
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>Car</th>
              <th>Year</th>
              <th>Type</th>
              <th>Location</th>
              <th>Price/day</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cars.map((c) => (
              <tr key={c.carId}>
                <td>
                  {c.imageUrls?.[0] ? (
                    <img className="table-thumb" src={c.imageUrls[0]} alt="" />
                  ) : (
                    "—"
                  )}
                </td>
                <td>{c.brand} {c.model}</td>
                <td>{c.year}</td>
                <td>{c.type}</td>
                <td>{c.location}</td>
                <td>{Number(c.pricePerDay).toLocaleString()} FCFA</td>
                <td>{c.available ? "Available" : "Unavailable"}</td>
                <td>
                  <button className="btn btn-small" onClick={() => edit(c)}>Edit</button>{" "}
                  <button className="btn btn-small danger-btn" onClick={() => remove(c.carId)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
