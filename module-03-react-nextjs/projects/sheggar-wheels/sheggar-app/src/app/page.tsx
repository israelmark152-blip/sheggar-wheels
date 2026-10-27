
"use client";

import { useMemo, useState } from "react";

const cars = [
  {
    id: 1,
    name: "Toyota Land Cruiser",
    category: "Premium SUV",
    price: 8500,
    seats: 7,
    transmission: "Automatic",
    location: "Bole, Addis Ababa",
    image:
      "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1000&q=85",
    tag: "POPULAR",
  },
  {
    id: 2,
    name: "Mercedes-Benz C-Class",
    category: "Luxury Sedan",
    price: 6500,
    seats: 5,
    transmission: "Automatic",
    location: "Kazanchis, Addis Ababa",
    image:
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=85",
    tag: "LUXURY",
  },
  {
    id: 3,
    name: "Toyota Corolla",
    category: "Economy Sedan",
    price: 2800,
    seats: 5,
    transmission: "Automatic",
    location: "Bole, Addis Ababa",
    image:
      "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?auto=format&fit=crop&w=1000&q=85",
    tag: "GREAT VALUE",
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-ET").format(price);
}

export default function Home() {
  const [location, setLocation] = useState("Addis Ababa");
  const [category, setCategory] = useState("All vehicles");
  const [search, setSearch] = useState("");

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      const matchesSearch = `${car.name} ${car.category} ${car.location}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "All vehicles" ||
        car.category.toLowerCase().includes(category.toLowerCase());

      const matchesLocation =
        !location.trim() ||
        car.location.toLowerCase().includes(location.toLowerCase());

      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [search, category, location]);

  return (
    <main>
      <header className="site-header">
        <a href="/" className="brand" aria-label="Sheggar Wheels home">
          <span className="brand-mark">S</span>
          <span>
            sheggar<span className="brand-accent">wheels</span>
            <small>YOUR JOURNEY, YOUR WAY</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a className="nav-active" href="#cars">Explore cars</a>
          <a href="#how-it-works">How it works</a>
          <a href="#why-us">Why Sheggar</a>
        </nav>

        <div className="header-actions">
          <a className="owner-link" href="#list-your-car">List your car</a>
          <a className="signin-button" href="/signin">Sign in <span>↗</span></a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-image" />
        <div className="hero-shade" />

        <div className="hero-content">
          <div className="eyebrow hero-eyebrow">
            <span className="live-dot" />
            A BETTER WAY TO MOVE
          </div>

          <h1>
            The road is
            <br />
            <span>yours to take.</span>
          </h1>

          <p className="hero-description">
            Find the right car for every journey. Discover trusted local
            vehicles and explore Addis Ababa on your own terms.
          </p>

          <div className="hero-stats">
            <div>
              <strong>Local</strong>
              <span>Car owners</span>
            </div>
            <div>
              <strong>Flexible</strong>
              <span>Your schedule</span>
            </div>
            <div>
              <strong>Simple</strong>
              <span>Booking process</span>
            </div>
          </div>
        </div>

        <div className="hero-caption">
          <span className="caption-line" />
          <span>YOUR NEXT JOURNEY STARTS HERE</span>
        </div>

        <div className="hero-counter">01 <span>/ 03</span></div>
      </section>

      <section className="search-section" aria-label="Find a rental car">
        <div className="search-heading">
          <div>
            <span className="eyebrow">FIND YOUR RIDE</span>
            <h2>Where are you headed?</h2>
          </div>
          <span className="search-note">A few details. The perfect ride.</span>
        </div>

        <form
          className="search-panel"
          onSubmit={(event) => {
            event.preventDefault();
            document.getElementById("cars")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
        >
          <label className="search-field">
            <span className="field-icon">⌖</span>
            <span className="field-copy">
              <span>Pickup location</span>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Where will you start?"
                aria-label="Pickup location"
              />
            </span>
          </label>

          <div className="search-divider" />

          <label className="search-field">
            <span className="field-icon">▦</span>
            <span className="field-copy">
              <span>Vehicle type</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Vehicle type"
              >
                <option>All vehicles</option>
                <option>SUV</option>
                <option>Sedan</option>
              </select>
            </span>
          </label>

          <div className="search-divider" />

          <label className="search-field search-keyword">
            <span className="field-icon">⌕</span>
            <span className="field-copy">
              <span>Looking for something?</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. Toyota, luxury..."
                aria-label="Search car names and categories"
              />
            </span>
          </label>

          <button className="search-button" type="submit">
            Explore cars <span>↗</span>
          </button>
        </form>
        <p className="demo-note">
          Demo listings for the capstone — availability and prices are illustrative.
        </p>
      </section>

      <section className="cars-section" id="cars">
        <div className="section-topline">
          <span className="eyebrow">THE COLLECTION</span>
          <span className="result-count">
            {filteredCars.length.toString().padStart(2, "0")} VEHICLES
          </span>
        </div>

        <div className="section-heading">
          <div>
            <h2>Find your kind of <span>freedom.</span></h2>
            <p>From everyday drives to unforgettable getaways.</p>
          </div>
          <a href="/cars" className="text-link">
            View all cars <span>↗</span>
          </a>
        </div>

        {filteredCars.length > 0 ? (
          <div className="car-grid">
            {filteredCars.map((car) => (
              <article className="car-card" key={car.id}>
                <a
                  href={`/cars/${car.id}`}
                  className="car-image-wrap"
                  aria-label={`View ${car.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={car.image} alt={car.name} className="car-image" />
                  <span className="car-tag">{car.tag}</span>
                  <span className="image-arrow" aria-hidden="true">↗</span>
                </a>

                <div className="car-details">
                  <div className="car-category">{car.category}</div>
                  <h3>{car.name}</h3>
                  <p className="car-location">⌖ {car.location}</p>

                  <div className="car-specs">
                    <span>♙ {car.seats} seats</span>
                    <span>⚙ {car.transmission}</span>
                  </div>

                  <div className="car-card-bottom">
                    <div className="car-price">
                      <strong>{formatPrice(car.price)}</strong>
                      <span>ETB / day</span>
                    </div>
                    <a
                      href={`/cars/${car.id}`}
                      className="view-car"
                      aria-label={`View details for ${car.name}`}
                    >
                      View car <span>↗</span>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>⌕</span>
            <h3>No matching cars yet</h3>
            <p>Try another search or choose all vehicles.</p>
            <button
              className="reset-button"
              onClick={() => {
                setLocation("Addis Ababa");
                setCategory("All vehicles");
                setSearch("");
              }}
            >
              Reset search
            </button>
          </div>
        )}
      </section>

      <section className="how-section" id="how-it-works">
        <div className="how-intro">
          <span className="eyebrow">THE EASY WAY</span>
          <h2>Three steps.<br /><span>One great journey.</span></h2>
          <p>Getting on the road shouldn't be complicated.</p>
        </div>

        <div className="steps-grid">
          <article className="step-card">
            <span className="step-number">01</span>
            <span className="step-icon">⌕</span>
            <h3>Find your car</h3>
            <p>Explore vehicles and choose the one that fits your plans.</p>
          </article>
          <article className="step-card">
            <span className="step-number">02</span>
            <span className="step-icon">▣</span>
            <h3>Request your dates</h3>
            <p>Choose your rental period and send a booking request.</p>
          </article>
          <article className="step-card">
            <span className="step-number">03</span>
            <span className="step-icon">↗</span>
            <h3>Enjoy the drive</h3>
            <p>Once confirmed, you're ready to plan your next adventure.</p>
          </article>
        </div>
      </section>

      <section className="owner-banner" id="list-your-car">
        <div>
          <span className="eyebrow">FOR CAR OWNERS</span>
          <h2>Your car can take you further.</h2>
          <p>Share your vehicle, manage requests and turn available days into opportunity.</p>
        </div>
        <a href="/signup" className="owner-cta">Become a host <span>↗</span></a>
      </section>

      <section className="why-section" id="why-us">
        <span className="eyebrow">THE SHEGGAR DIFFERENCE</span>
        <h2>Made for the way <span>we move.</span></h2>
        <div className="why-grid">
          <div><strong>01 / LOCAL FIRST</strong><h3>Rooted in Addis</h3><p>A marketplace designed around local journeys and local vehicle owners.</p></div>
          <div><strong>02 / YOUR CHOICE</strong><h3>More ways to move</h3><p>Explore different vehicles for everyday errands, work or a weekend away.</p></div>
          <div><strong>03 / BUILT FOR CLARITY</strong><h3>Know the details</h3><p>Compare vehicle features, rental rates and your booking status in one place.</p></div>
        </div>
      </section>

      <footer className="site-footer">
        <a href="/" className="brand footer-brand">
          <span className="brand-mark">S</span>
          <span>sheggar<span className="brand-accent">wheels</span><small>YOUR JOURNEY, YOUR WAY</small></span>
        </a>
        <p>Every journey begins somewhere.</p>
        <div className="footer-links">
          <a href="#cars">Explore cars</a>
          <a href="#how-it-works">How it works</a>
          <a href="#list-your-car">List your car</a>
        </div>
        <span className="copyright">© 2026 Sheggar Wheels · Capstone demo</span>
      </footer>
    </main>
  );
}
