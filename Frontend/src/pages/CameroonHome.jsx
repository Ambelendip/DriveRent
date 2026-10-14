import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import "../home.css";

const cities = ["Douala", "Yaounde", "Buea", "Bamenda", "Bafoussam", "Kribi"];
const trips = [
  { label: "THE COAST", title: "Kribi, at the water's edge", image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=85", text: "Make room for a slower weekend by the sea." },
  { label: "THE HIGHLANDS", title: "A road toward Mount Cameroon", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85", text: "Find a vehicle that suits the climb and the views." },
  { label: "THE CITY", title: "A different side of Yaounde", image: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=900&q=85", text: "Set your own pace between the places on your list." },
  { label: "WILDLIFE", title: "Forest roads and wild places", image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85", text: "Make space for a nature-focused journey and a slower itinerary." },
  { label: "CULTURE", title: "A journey through living heritage", image: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85", text: "Plan a visit around local art, food and cultural landmarks." },
  { label: "COUNTRYSIDE", title: "From plantations to open road", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=85", text: "Explore the countryside at your own pace, with room for a detour." }
];
const faqs = [
  ["What do I need to book a vehicle?", "Have your driving details and preferred dates ready. The team will confirm any vehicle-specific requirements with you."],
  ["Can I return the car in another city?", "Add your preferred return location to your booking request. Availability and any extra fees will be confirmed before approval."],
  ["How do I arrange an airport pickup or driver?", "Send a service request with your arrival details and pickup location. The team will follow up to confirm arrangements."],
  ["When is my booking confirmed?", "Your booking status appears in your account. Wait for confirmation before making travel plans."],
  ["Can I request a specific service?", "Choose a service or describe your needs in a request, and the team will confirm what is available."]
];

export default function CameroonHome() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [type, setType] = useState("");
  const [cars, setCars] = useState([]);
  const [content, setContent] = useState({ SERVICE: [], EVENT: [], POST: [], DISCOUNT: [] });
  const [reviews, setReviews] = useState([]);
  const [faqIndex, setFaqIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      api.getCars(), api.getContent("SERVICE"), api.getContent("EVENT"),
      api.getContent("POST"), api.getContent("DISCOUNT")
    ]).then(async ([carResult, serviceResult, eventResult, postResult, discountResult]) => {
      if (!mounted) return;
      const data = (result) => result.status === "fulfilled" && Array.isArray(result.value) ? result.value : [];
      const vehicleList = data(carResult);
      setCars(vehicleList);
      setContent({ SERVICE: data(serviceResult), EVENT: data(eventResult), POST: data(postResult), DISCOUNT: data(discountResult) });
      if (vehicleList[0]) {
        const reviewData = await api.getReviews(vehicleList[0].carId).catch(() => null);
        if (mounted && reviewData?.reviews) setReviews(reviewData.reviews.slice(0, 3));
      }
    });
    return () => { mounted = false; };
  }, []);

  function search(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (type) params.set("type", type);
    navigate(`/cars${params.size ? `?${params}` : ""}`);
  }

  const pickupCities = [...new Set(cars.map((car) => car.location?.split("-")[0].trim()).filter(Boolean))];
  const currentOffers = content.DISCOUNT.filter((offer) => {
    const today = new Date().toISOString().slice(0, 10);
    return (!offer.startDate || offer.startDate.slice(0, 10) <= today) && (!offer.endDate || offer.endDate.slice(0, 10) >= today);
  });
  const shownServices = content.SERVICE.length ? content.SERVICE.slice(0, 6) : [
    { contentId: "rental", title: "Self-drive rental", summary: "Pick a vehicle and set out on your own schedule." },
    { contentId: "airport", title: "Airport transfer", summary: "Arrange a pickup around your arrival and destination." },
    { contentId: "chauffeur", title: "Car with a driver", summary: "Request a driver for a business day or special trip." },
    { contentId: "group", title: "Group travel", summary: "Find space for family, friends or a larger party." }
  ];

  return (
    <>
      <section className="hero home-hero">
        <div className="hero-content home-hero-content">
          <p className="eyebrow">DRIVERENT · CAMEROON</p>
          <h1>Your next road starts here.</h1>
          <p className="hero-copy">Find a car for the city, the coast or the long way through the highlands.</p>
          <form className="search-box home-search" onSubmit={search}>
            <label>Pickup city<input list="cameroon-cities" placeholder="Where are you starting?" value={location} onChange={(event) => setLocation(event.target.value)} /></label>
            <datalist id="cameroon-cities">{cities.map((city) => <option key={city} value={city} />)}</datalist>
            <label>Vehicle type<select value={type} onChange={(event) => setType(event.target.value)}><option value="">Any vehicle</option><option value="SEDAN">Economy / sedan</option><option value="SUV">SUV / 4x4</option><option value="VAN">Minibus / van</option><option value="HATCHBACK">Hatchback</option></select></label>
            <button className="btn">Explore cars <span aria-hidden="true">↗</span></button>
          </form>
          <div className="hero-proof"><span>{cars.length || "—"} vehicles listed</span><span>{pickupCities.length || "—"} pickup areas</span><span>Manage requests in your account</span></div>
        </div>
        <a className="hero-scroll" href="#about">Scroll to explore <span aria-hidden="true">↓</span></a>
      </section>

      <div className="audience-ribbon"><span>WEEKEND TRIPS</span><i>✳</i><span>BUSINESS TRAVEL</span><i>✳</i><span>FAMILY VISITS</span><i>✳</i><span>CAMEROON ROAD TRIPS</span></div>

      <section className="section home-about" id="about">
        <div className="home-about-image"><img src="https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1000&q=85" alt="Cabin tucked into a green mountain landscape" /><span className="image-caption">The journey is part of the destination.</span></div>
        <div className="home-about-copy"><p className="eyebrow">A BETTER WAY TO GET THERE</p><h2>Room to roam. A little less to plan.</h2><p>Browse the available fleet, compare daily rates and send a booking request in one place. From a quick airport run to a weekend out of town, find a vehicle that fits your plans.</p><div className="stat-strip"><div><strong>{cars.length || "—"}</strong><span>vehicles to explore</span></div><div><strong>{pickupCities.length || "—"}</strong><span>pickup areas listed</span></div><div><strong>24/7</strong><span>your plans, your pace</span></div></div><Link className="text-link" to="/cars">Meet the fleet ↗</Link></div>
      </section>

      {currentOffers.length > 0 && <section className="section promo-section" id="offers"><div className="section-heading"><div><p className="eyebrow">A GOOD TIME TO GO</p><h2>Current car offers</h2></div><Link to="/cars" className="text-link">See all vehicles ↗</Link></div><div className="promo-grid">{currentOffers.slice(0, 3).map((offer) => { const car = cars.find((vehicle) => vehicle.carId === offer.carId); return <Link className="promo-card" key={offer.contentId} to={car ? `/cars/${car.carId}` : "/cars"}><span className="promo-tag">{Number(offer.percentOff)}% off</span><div><p>{car ? `${car.brand} ${car.model}` : "Limited-time offer"}</p><h3>{offer.title}</h3><span>{offer.summary}</span></div><b className="promo-arrow" aria-hidden="true">↗</b></Link>; })}</div></section>}

      <section className="section fleet-section" id="fleet"><div className="section-heading"><div><p className="eyebrow">FIND YOUR FIT</p><h2>Vehicles for the road you have in mind.</h2><p className="section-lede">A few from the current fleet. Availability and rates are shown on each vehicle.</p></div><Link to="/cars" className="text-link">Browse the fleet ↗</Link></div><div className="home-fleet-grid">{cars.slice(0, 3).map((car, index) => <Link className={`home-fleet-card fleet-card-${index + 1}`} key={car.carId} to={`/cars/${car.carId}`}><img src={car.imageUrls?.[0] || car.imageUrl || "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=85"} alt={`${car.brand} ${car.model}`} /><div className="home-fleet-info"><span>{car.type || "VEHICLE"} · {car.location || "CAMEROON"}</span><h3>{car.brand} {car.model}</h3><p>{Number(car.pricePerDay || 0).toLocaleString()} FCFA <small>/ day</small><b aria-hidden="true">↗</b></p></div></Link>)}</div>{cars.length === 0 && <div className="empty">Fleet listings are loading. Browse all vehicles to see current availability.</div>}</section>

      <section className="section services-section" id="services"><div className="section-heading"><div><p className="eyebrow">MORE THAN A SET OF KEYS</p><h2>Make the trip work for you.</h2><p className="section-lede">Tell us what the journey needs. We’ll follow up to confirm the details.</p></div><Link to="/services" className="text-link">All services ↗</Link></div><div className="service-grid">{shownServices.map((service, index) => <Link className="service-tile" to="/services" key={service.contentId}><span className="service-index">0{index + 1}</span><div><h3>{service.title}</h3><p>{service.summary}</p></div><span className="service-link" aria-hidden="true">↗</span></Link>)}</div></section>

      <section className="tour-band" id="tours"><div className="tour-intro"><p className="eyebrow">TAKE THE SCENIC ROUTE</p><h2>Some places are better reached by road.</h2><p>Ideas for your next escape, with a vehicle to match the way there.</p><div className="tour-actions"><Link className="btn btn-light" to="/cars">Choose a vehicle ↗</Link><a className="tour-all-link" href="#tours">View All Tours ↓</a></div></div><div className="tour-cards">{trips.map((trip) => <article className="tour-card" key={trip.label}><img src={trip.image} alt="" /><div><span>{trip.label}</span><h3>{trip.title}</h3><p>{trip.text}</p></div></article>)}</div></section>

      {content.EVENT.length > 0 && <section className="section editorial-section"><div className="section-heading"><div><p className="eyebrow">ON THE CALENDAR</p><h2>Upcoming events</h2></div></div><div className="editorial-grid">{content.EVENT.slice(0, 3).map((event) => <article className="editorial-card" key={event.contentId}>{event.imageUrl && <img src={event.imageUrl} alt={event.imageAlt || ""} />}<div><span>{event.startDate || "UPCOMING"}{event.location ? ` · ${event.location}` : ""}</span><h3>{event.title}</h3><p>{event.summary}</p></div></article>)}</div></section>}
      {content.POST.length > 0 && <section className="section editorial-section"><div className="section-heading"><div><p className="eyebrow">NOTES FROM THE ROAD</p><h2>Stories & updates</h2></div></div><div className="editorial-grid">{content.POST.slice(0, 3).map((post) => <article className="editorial-card" key={post.contentId}>{post.imageUrl && <img src={post.imageUrl} alt={post.imageAlt || ""} />}<div><span>DRIVERENT JOURNAL</span><h3>{post.title}</h3><p>{post.summary}</p></div></article>)}</div></section>}

      <section className="section locations-section" id="locations"><div><p className="eyebrow">START WHERE YOU ARE</p><h2>Pick up in a city that feels like yours.</h2><p className="section-lede">Choose a pickup area and explore vehicles currently listed there.</p></div><div className="city-list">{(pickupCities.length ? pickupCities : cities).map((city, index) => <Link key={city} to={`/cars?location=${encodeURIComponent(city)}`}><span>0{index + 1}</span>{city}<b aria-hidden="true">↗</b></Link>)}</div></section>

      <section className="section map-section" aria-labelledby="map-heading"><div className="map-heading"><div><p className="eyebrow">ACROSS CAMEROON</p><h2 id="map-heading">Find your way around.</h2><p className="section-lede">Explore pickup cities and plan the roads between them.</p></div><a className="text-link" href="https://www.google.com/maps/search/?api=1&query=Cameroon" target="_blank" rel="noreferrer">Open in Google Maps ↗</a></div><div className="map-frame"><iframe title="Map of Cameroon" src="https://maps.google.com/maps?q=Cameroon&t=&z=6&ie=UTF8&iwloc=&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div></section>

      {reviews.length > 0 && <section className="review-band"><div><p className="eyebrow">FROM VEHICLE REVIEWS</p><h2>Notes from fellow travelers.</h2><p>Feedback customers shared on vehicles in the fleet.</p></div><div className="review-cards">{reviews.map((review) => <blockquote key={review.reviewId}><span className="review-stars">{"★".repeat(Math.max(1, Math.min(5, Number(review.rating) || 5)))}</span><p>“{review.comment}”</p><footer>{review.userName || "DriveRent customer"}</footer></blockquote>)}</div></section>}

      <section className="section faq-section"><div><p className="eyebrow">GOOD TO KNOW</p><h2>A few things people ask.</h2><p className="section-lede">Need a detail that isn’t covered? Send a service request and we’ll get back to you.</p><Link className="text-link" to="/services">Ask about a service ↗</Link></div><div className="faq-list">{faqs.map(([question, answer], index) => <div className="faq-item" key={question}><button aria-expanded={faqIndex === index} onClick={() => setFaqIndex(faqIndex === index ? -1 : index)}><span>{question}</span><b>{faqIndex === index ? "−" : "+"}</b></button>{faqIndex === index && <p>{answer}</p>}</div>)}</div></section>

      <section className="closing-band"><div><p className="eyebrow">THE OPEN ROAD IS WAITING</p><h2>Where will you go next?</h2><p>Find a car or tell us what your trip needs.</p></div><div><Link className="btn btn-light" to="/cars">Browse cars ↗</Link><Link className="closing-secondary" to="/services">Request a service ↗</Link></div></section>
      <footer className="site-footer"><Link to="/" className="brand">Drive<span>Rent</span></Link><p>Car rental, made for the way you travel around Cameroon.</p><nav><a href="#fleet">Fleet</a><a href="#services">Services</a><a href="#tours">Tours</a><a href="#locations">Locations</a><Link to="/login">Your account</Link></nav><small>© {new Date().getFullYear()} DriveRent</small></footer>
    </>
  );
}
