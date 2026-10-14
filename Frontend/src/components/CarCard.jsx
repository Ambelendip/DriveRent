import { Link } from "react-router-dom";

const placeholder = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80";

export default function CarCard({ car, discount }) {
  const image = car.imageUrls?.[0] || car.imageUrl || placeholder;
  const dailyRate = Number(car.pricePerDay || 0);
  const offerRate = discount ? dailyRate * (1 - Number(discount.percentOff) / 100) : dailyRate;

  return (
    <article className="car-card">
      {discount && <span className="car-offer-tag">{Number(discount.percentOff)}% off</span>}
      <img src={image} alt={`${car.brand} ${car.model}`} />
      <div className="card-body">
        <div className="row-between">
          <h3>{car.brand} {car.model}</h3>
          <span className={`badge ${car.available ? "success" : "danger"}`}>
            {car.available ? "Available" : "Unavailable"}
          </span>
        </div>
        <p className="muted">
          {car.year} · {car.transmission} · {car.fuelType} · {car.seats} seats
        </p>
        <div className="row-between card-footer">
          <strong>{offerRate.toLocaleString()} FCFA/day{discount && <del>{dailyRate.toLocaleString()}</del>}</strong>
          <Link className="btn btn-small" to={`/cars/${car.carId}`}>View</Link>
        </div>
      </div>
    </article>
  );
}