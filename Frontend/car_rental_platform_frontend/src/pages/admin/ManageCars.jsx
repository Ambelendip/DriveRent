import { useEffect, useState } from "react";
import { api, uploadToS3 } from "../../services/api";
import { config } from "../../config";

const empty = { brand:"", model:"", year:"", type:"SEDAN", transmission:"AUTOMATIC", fuelType:"PETROL", seats:5, pricePerDay:"", location:"", description:"", available:true };

export default function ManageCars() {
  const [cars, setCars] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  async function load() {
    const data = await api.getCars();
    setCars(Array.isArray(data) ? data : data?.cars || []);
  }

  useEffect(()=>{ load().catch(e=>setMessage(e.message)); }, []);

  function edit(car) {
    setEditing(car.carId);
    setForm({...empty, ...car});
    window.scrollTo({top:0, behavior:"smooth"});
  }

  async function submit(e) {
    e.preventDefault(); setMessage("");
    try {
      let imageUrls = form.imageUrls || [];
      if (file) {
        const upload = await api.createUploadUrl({
          fileName: file.name,
          contentType: file.type,
          folder: config.uploadPath
        });
        await uploadToS3(upload.uploadUrl || upload.url, file);
        imageUrls = [...imageUrls, upload.fileUrl || upload.publicUrl || upload.objectUrl];
      }

      const payload = {...form, year:Number(form.year), seats:Number(form.seats), pricePerDay:Number(form.pricePerDay), imageUrls};
      if (editing) await api.updateCar(editing, payload);
      else await api.createCar(payload);

      setForm(empty); setFile(null); setEditing(null);
      await load();
      setMessage("Car saved successfully.");
    } catch (e) { setMessage(e.message); }
  }

  async function remove(id) {
    if (!confirm("Delete this car?")) return;
    try { await api.deleteCar(id); await load(); }
    catch (e) { setMessage(e.message); }
  }

  return (
    <section className="section">
      <p className="eyebrow">ADMINISTRATION</p><h1>Manage cars</h1>
      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label>Brand<input required value={form.brand} onChange={e=>setForm({...form,brand:e.target.value})}/></label>
          <label>Model<input required value={form.model} onChange={e=>setForm({...form,model:e.target.value})}/></label>
          <label>Year<input type="number" required value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label>
          <label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>SEDAN</option><option>SUV</option><option>HATCHBACK</option><option>VAN</option></select></label>
          <label>Transmission<select value={form.transmission} onChange={e=>setForm({...form,transmission:e.target.value})}><option>AUTOMATIC</option><option>MANUAL</option></select></label>
          <label>Fuel<select value={form.fuelType} onChange={e=>setForm({...form,fuelType:e.target.value})}><option>PETROL</option><option>DIESEL</option><option>ELECTRIC</option></select></label>
          <label>Seats<input type="number" value={form.seats} onChange={e=>setForm({...form,seats:e.target.value})}/></label>
          <label>Price/day<input type="number" required value={form.pricePerDay} onChange={e=>setForm({...form,pricePerDay:e.target.value})}/></label>
          <label>Location<input required value={form.location} onChange={e=>setForm({...form,location:e.target.value})}/></label>
          <label>Image<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0] || null)}/></label>
        </div>
        <label>Description<textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <div className="button-row">
          <button className="btn">{editing ? "Update car" : "Add car"}</button>
          {editing && <button type="button" className="btn secondary" onClick={()=>{setEditing(null);setForm(empty)}}>Cancel</button>}
        </div>
        {message && <div className="alert">{message}</div>}
      </form>

      <div className="table-wrap">
        <table><thead><tr><th>Car</th><th>Location</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{cars.map(c=><tr key={c.carId}>
          <td>{c.brand} {c.model}</td><td>{c.location}</td><td>{Number(c.pricePerDay).toLocaleString()} FCFA</td>
          <td>{c.available ? "Available" : "Unavailable"}</td>
          <td><button className="btn btn-small" onClick={()=>edit(c)}>Edit</button>{" "}
          <button className="btn btn-small danger-btn" onClick={()=>remove(c.carId)}>Delete</button></td>
        </tr>)}</tbody></table>
      </div>
    </section>
  );
}