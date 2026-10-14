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
  const [discount, setDiscount] = useState(null);
  const [reviews, setReviews] = useState({ reviews: [], averageRating: 0, count: 0 });
  const [form, setForm] = useState({
    pickupDate: "",
    returnDate: "",
    pickupTime: "10:00",
    returnTime: "10:00",
    pickupLocation: "Douala",
    returnLocation: "Douala"
  });
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [message, setMessage] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  async function loadReviews() {
    try {
      const result = await api.getReviews(carId);
      setReviews({
        reviews: Array.isArray(result?.reviews) ? result.reviews : [],
        averageRating: Number(result?.averageRating) || 0,
        count: Number(result?.count) || 0
      });
    } catch {
      setReviews({ reviews: [], averageRating: 0, count: 0 });
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCar(null);
    setMessage("");
    Promise.all([api.getCar(carId), api.getContent("DISCOUNT").catch(() => [])])
      .then(([vehicle, promotions]) => {
        if (!active) return;
        if (!vehicle || typeof vehicle !== "object" || !vehicle.carId) {
          throw new Error("This vehicle could not be loaded. Return to the fleet and choose another car.");
        }
        setCar(vehicle);
        const today = new Date().toISOString().slice(0, 10);
        const activePromotions = (Array.isArray(promotions) ? promotions : []).filter((offer) => offer.carId === vehicle.carId && (!offer.startDate || offer.startDate.slice(0, 10) <= today) && (!offer.endDate || offer.endDate.slice(0, 10) >= today));
        setDiscount(activePromotions.reduce((best, offer) => Number(offer.percentOff) > Number(best?.percentOff || 0) ? offer : best, null));
      })
      .catch((e) => { if (active) setMessage(e.message || "Unable to load this vehicle."); })
      .finally(() => { if (active) setLoading(false); });
    loadReviews();
    return () => { active = false; };
  }, [carId]);

  const days = useMemo(() => {
    if (!form.pickupDate || !form.returnDate) return 0;
    const a = new Date(form.pickupDate);
    const b = new Date(form.returnDate);
    const diff = Math.ceil((b - a) / 86400000);
    return diff > 0 ? diff : 0;
  }, [form]);

  const total = days * Number(car?.pricePerDay || 0);
  const discountedTotal = discount ? total * (1 - Number(discount.percentOff) / 100) : total;

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
        returnDate: form.returnDate,
        pickupTime: form.pickupTime,
        returnTime: form.returnTime,
        pickupLocation: form.pickupLocation,
        returnLocation: form.returnLocation
      });
      navigate("/dashboard/bookings");
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBooking(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    setReviewMsg("");
    try {
      await api.createReview({ carId, rating: reviewForm.rating, comment: reviewForm.comment });
      setReviewForm({ rating: 5, comment: "" });
      await loadReviews();
      setReviewMsg("Review submitted.");
    } catch (err) {
      setReviewMsg(err.message);
    }
  }

  if (loading) return <Loader />;
  if (!car)
    return (
      <section className="section">
        <div className="alert error">{message || "Car not found."}</div>
      </section>
    );

  const image = car.imageUrls?.[0] || car.imageUrl;

  return (
    <section className="section">
      <div className="details-grid">
        <div>
          <img className="details-image" src={image} alt={`${car.brand} ${car.model}`} />
          {car.imageUrls?.length > 1 && (
            <div className="thumb-row">
              {car.imageUrls.map((url, i) => (
                <img key={i} src={url} alt="" />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="eyebrow">{car.type}</p>
          <h1>{car.brand} {car.model}</h1>
          <p className="muted">
            {car.year} · {car.transmission} · {car.fuelType} · {car.seats} seats
            {" · "}
            <span className="badge">★ {reviews.averageRating || "—"} ({reviews.count})</span>
          </p>
          <p>{car.description}</p>
          {discount && <p className="active-car-offer"><strong>{Number(discount.percentOff)}% off</strong> · {discount.title}</p>}
          <h2>{Number(car.pricePerDay).toLocaleString()} FCFA <small>/ day</small></h2>

          {user?.role === "ADMIN" ? (
            <div className="alert">
              Administrators manage the fleet and cannot book cars. Use the Admin panel to edit this vehicle.
            </div>
          ) : (
            <form className="booking-card" onSubmit={book}>
              <h3>Book this car</h3>
              <div className="form-grid">
                <label>Pickup location<input value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} /></label>
                <label>Return location<input value={form.returnLocation} onChange={(e) => setForm({ ...form, returnLocation: e.target.value })} /></label>
                <label>Pickup date<input type="date" required value={form.pickupDate} onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} /></label>
                <label>Return date<input type="date" required value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} /></label>
                <label>Pickup time<input type="time" value={form.pickupTime} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })} /></label>
                <label>Return time<input type="time" value={form.returnTime} onChange={(e) => setForm({ ...form, returnTime: e.target.value })} /></label>
              </div>
              <div className="row-between">
                <span>{days} day(s) · {car.location}</span>
                <strong>{discount ? <><del>{total.toLocaleString()} FCFA</del> {discountedTotal.toLocaleString()} FCFA</> : `${total.toLocaleString()} FCFA`}</strong>
              </div>
              {discount && <small className="muted">Estimate includes the current offer. The server confirms the final booking total.</small>}
              {message && <div className="alert error">{message}</div>}
              <button className="btn full" disabled={booking || !car.available}>
                {booking ? "Booking..." : car.available ? "Confirm Booking" : "Unavailable"}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="section">
        <h2>Reviews</h2>
        <div className="table-wrap">
          {reviews.reviews.length === 0 ? (
            <div className="empty">No reviews yet.</div>
          ) : (
            <ul className="review-list">
              {reviews.reviews.map((r) => (
                <li key={r.reviewId}>
                  <strong>{r.userName}</strong> <span className="badge">★ {r.rating}</span>
                  <p>{r.comment}</p>
                  <small>{new Date(r.createdAt).toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
        {user && (
          <form className="form-card" onSubmit={submitReview}>
            <h3>Leave a review</h3>
            <label>
              Rating{" "}
              <select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} stars</option>
                ))}
              </select>
            </label>
            <label>Comment<textarea rows="3" value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} /></label>
            {reviewMsg && <div className="alert">{reviewMsg}</div>}
            <button className="btn">Submit review</button>
          </form>
        )}
      </div>
    </section>
  );
}