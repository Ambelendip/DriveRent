import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

export default function CarDetails() {
  const { carId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [car, setCar] = useState(null);
  const [form, setForm] = useState({ pickupDate: "", returnDate: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.getCar(carId).then(setCar).catch(e => setMessage(e.message)).finally(() => setLoading(false));
  }, [carId]);

  const days = useMemo(() => {
    if (!form.pickupDate || !form.returnDate) return 0;
    const a = new Date(form.pickupDate);
    const b = new Date(form.returnDate);
    const diff = Math.ceil((b - a) / 86400000);
    return diff > 0 ? diff : 0;
  }, [form]);

  const total = days * Number(car?.pricePerDay || 0);

  async function book(e) {
    e.preventDefault();
    if (!user) return navigate("/login");
    if (!days) return setMessage("Return date must be after pickup date.");

    setBooking(true);
    setMessage("");
    try {
      await api.createBooking({
        carId,
        pickupDate: form.pickupDate,
        returnDate: form.returnDate
      });
      navigate("/dashboard/bookings");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBooking(false);
    }
  }

  if (loading) return <Loader />;
  if (!car) return <section className="section"><div className="alert error">{message || "Car not found."}</div></section>;

  const image = car.imageUrls?.[0] || car.imageUrl;

  return (
    <section className="section">
      <div className="details-grid">
        <div>
          <img className="details-image" src={image} alt={`${car.brand} ${car.model}`} />
          {car.imageUrls?.length > 1 && (
            <div className="thumb-row">
              {car.imageUrls.map((url, i) => <img key={i} src={url} alt="" />)}
            </div>
          )}
        </div>

        <div>
          <p className="eyebrow">{car.type}</p>
          <h1>{car.brand} {car.model}</h1>
          <p className="muted">{car.year} · {car.transmission} · {car.fuelType} · {car.seats} seats</p>
          <p>{car.description}</p>
          <h2>{Number(car.pricePerDay).toLocaleString()} FCFA <small>/ day</small></h2>

          <form className="booking-card" onSubmit={book}>
            <h3>Book this car</h3>
            <label>Pickup date<input type="date" required value={form.pickupDate} onChange={e => setForm({...form, pickupDate: e.target.value})} /></label>
            <label>Return date<input type="date" required value={form.returnDate} onChange={e => setForm({...form, returnDate: e.target.value})} /></label>
            <div className="row-between"><span>{days} day(s)</span><strong>{total.toLocaleString()} FCFA</strong></div>
            {message && <div className="alert error">{message}</div>}
            <button className="btn full" disabled={booking || !car.available}>
              {booking ? "Booking..." : car.available ? "Confirm Booking" : "Unavailable"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}