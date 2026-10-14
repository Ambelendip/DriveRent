import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import CarCard from "../components/CarCard";
import Loader from "../components/Loader";

export default function Cars() {
  const [params] = useSearchParams();
  const [cars, setCars] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    location: params.get("location") || "",
    type: params.get("type") || "",
    transmission: "",
    fuelType: ""
  });

  async function loadCars() {
    setLoading(true);
    setError("");
    try {
      const data = await api.getCars(filters);
      setCars(Array.isArray(data) ? data : data?.cars || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCars();
    api.getContent("DISCOUNT").then((data) => setDiscounts(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  return (
    <section className="section">
      <div className="section-heading">
        <div><p className="eyebrow">OUR FLEET</p><h1>Available cars</h1></div>
      </div>

      <div className="filters">
        <input placeholder="Location" value={filters.location}
          onChange={e => setFilters({...filters, location: e.target.value})} />
        <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
          <option value="">All types</option><option value="SEDAN">Sedan</option>
          <option value="SUV">SUV</option><option value="HATCHBACK">Hatchback</option>
          <option value="VAN">Van</option>
        </select>
        <select value={filters.transmission} onChange={e => setFilters({...filters, transmission: e.target.value})}>
          <option value="">Transmission</option><option value="AUTOMATIC">Automatic</option>
          <option value="MANUAL">Manual</option>
        </select>
        <select value={filters.fuelType} onChange={e => setFilters({...filters, fuelType: e.target.value})}>
          <option value="">Fuel</option><option value="PETROL">Petrol</option>
          <option value="DIESEL">Diesel</option><option value="ELECTRIC">Electric</option>
        </select>
        <button className="btn" onClick={loadCars}>Search</button>
      </div>

      {loading && <Loader />}
      {error && <div className="alert error">{error}</div>}
      {!loading && !error && cars.length === 0 && <div className="empty">No cars found.</div>}

      <div className="car-grid">
        {cars.map((car) => {
          const today = new Date().toISOString().slice(0, 10);
          const discount = discounts
            .filter((offer) => offer.carId === car.carId && (!offer.startDate || offer.startDate.slice(0, 10) <= today) && (!offer.endDate || offer.endDate.slice(0, 10) >= today))
            .reduce((best, offer) => Number(offer.percentOff) > Number(best?.percentOff || 0) ? offer : best, null);
          return <CarCard key={car.carId} car={car} discount={discount} />;
        })}
      </div>
    </section>
  );
}