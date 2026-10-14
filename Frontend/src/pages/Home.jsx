import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  function search(e) {
    e.preventDefault();
    navigate(`/cars${location ? `?location=${encodeURIComponent(location)}` : ""}`);
  }

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">FAST · SIMPLE · RELIABLE</p>
          <h1>Find the right car for your next journey.</h1>
          <p className="hero-copy">
            Browse reliable vehicles, check availability and book your ride in minutes.
          </p>
          <form className="search-box" onSubmit={search}>
            <input
              placeholder="Pickup location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <button className="btn">Search Cars</button>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WHY DRIVERENT</p>
            <h2>Everything you need to rent with confidence.</h2>
          </div>
          <Link to="/cars" className="text-link">Browse all cars →</Link>
        </div>

        <div className="feature-grid">
          <div className="feature"><h3>Easy booking</h3><p>Choose your vehicle and dates without unnecessary steps.</p></div>
          <div className="feature"><h3>Transparent pricing</h3><p>See the daily rate and total before confirming your reservation.</p></div>
          <div className="feature"><h3>Secure accounts</h3><p>Authentication is handled by Amazon Cognito.</p></div>
        </div>
      </section>
    </>
  );
}