
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cars } from "@/lib/cars";
import { getAllCars } from "@/lib/car-storage";
import { getReviewsForCar } from "@/lib/review-storage";
import type { Review } from "@/types/review";
import type { Car } from "@/lib/cars";

const PAGE_SIZE = 6;

type SortOption =
  | "recommended"
  | "price-low"
  | "price-high"
  | "newest";

export default function CarsPage() {
  const [allCars, setAllCars] = useState<Car[]>(cars);
  const [carsLoaded, setCarsLoaded] = useState(false);
  const [reviewsByCar, setReviewsByCar] = useState<
    Record<string, Review[]>
  >({});

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All vehicles");
  const [location, setLocation] = useState("All locations");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState<SortOption>("recommended");
  const [page, setPage] = useState(1);

  useEffect(() => {
    function loadCars() {
      const availableCars = getAllCars();

      // Keep all original demo cars and only active owner listings.
      const visibleCars = availableCars.filter(
        (car) =>
          cars.some((demoCar) => demoCar.id === car.id) ||
          car.listingStatus === "active"
      );

      setAllCars(visibleCars);

      // Load saved customer reviews for each visible car.
      const reviewMap: Record<string, Review[]> = {};

      for (const car of visibleCars) {
        reviewMap[car.id] = getReviewsForCar(car.id);
      }

      setReviewsByCar(reviewMap);
      setCarsLoaded(true);
    }

    loadCars();

    // Refresh when localStorage changes in another browser tab.
    window.addEventListener("storage", loadCars);

    return () => {
      window.removeEventListener("storage", loadCars);
    };
  }, []);

  const locations = useMemo(
    () => [...new Set(allCars.map((car) => car.location))].sort(),
    [allCars]
  );

  const filteredCars = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minimum = minPrice.trim() === "" ? null : Number(minPrice);
    const maximum = maxPrice.trim() === "" ? null : Number(maxPrice);

    const result = allCars.filter((car) => {
      const searchableText =
        `${car.name} ${car.description} ${car.location} ${car.category}`.toLowerCase();

      const matchesSearch = searchableText.includes(query);
      const matchesCategory =
        category === "All vehicles" || car.category === category;
      const matchesLocation =
        location === "All locations" || car.location === location;
      const matchesMinPrice =
        minimum === null ||
        (Number.isFinite(minimum) && car.price >= minimum);
      const matchesMaxPrice =
        maximum === null ||
        (Number.isFinite(maximum) && car.price <= maximum);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });

    if (sort === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === "newest") {
      result.sort((a, b) => b.year - a.year);
    } else {
      result.sort((a, b) => {
        const aIndex = cars.findIndex((car) => car.id === a.id);
        const bIndex = cars.findIndex((car) => car.id === b.id);

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;

        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [allCars, search, category, location, minPrice, maxPrice, sort]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCars.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedCars = filteredCars.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setPage(1);
  }, [search, category, location, minPrice, maxPrice, sort]);

  function resetFilters() {
    setSearch("");
    setCategory("All vehicles");
    setLocation("All locations");
    setMinPrice("");
    setMaxPrice("");
    setSort("recommended");
    setPage(1);
  }

  return (
    <main className="catalog-page">
      <section className="catalog-heading">
        <p className="eyebrow">
          THE COLLECTION · {allCars.length} VEHICLES
        </p>

        <h1>Find your kind of freedom.</h1>

        <p>
          Explore local vehicles and find the right ride for your next journey
          in Addis Ababa.
        </p>

        <p className="demo-notice">
          Demo data · Prices are displayed in Ethiopian birr (ETB).
        </p>
      </section>

      <section className="catalog-content">
        <div className="catalog-toolbar">
          <div>
            <h2>Explore cars</h2>
            <p>
              {carsLoaded
                ? `${filteredCars.length} ${
                    filteredCars.length === 1 ? "vehicle" : "vehicles"
                  } found`
                : "Loading vehicles..."}
            </p>
          </div>

          <label className="catalog-sort">
            <span>Sort by</span>
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortOption)
              }
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="newest">Newest model year</option>
            </select>
          </label>
        </div>

        <div className="catalog-layout">
          <aside className="catalog-filters">
            <div className="filter-heading">
              <h3>Filters</h3>
              <button type="button" onClick={resetFilters}>
                Reset
              </button>
            </div>

            <label className="filter-field">
              <span>Search vehicles</span>
              <input
                type="search"
                placeholder="Name, description, location..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="filter-field">
              <span>Vehicle type</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option>All vehicles</option>
                <option>SUV</option>
                <option>Sedan</option>
                <option>Minivan</option>
              </select>
            </label>

            <label className="filter-field">
              <span>Pickup location</span>
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              >
                <option>All locations</option>
                {locations.map((place) => (
                  <option key={place} value={place}>
                    {place}
                  </option>
                ))}
              </select>
            </label>

            <div className="filter-field">
              <span>Daily price (ETB)</span>

              <div className="price-filter-row">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  aria-label="Minimum daily price in ETB"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />

                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  aria-label="Maximum daily price in ETB"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </div>

              {minPrice !== "" &&
                maxPrice !== "" &&
                Number(minPrice) > Number(maxPrice) && (
                  <p role="alert">
                    Minimum price must not exceed maximum price.
                  </p>
                )}
            </div>
          </aside>

          <div className="catalog-results">
            {!carsLoaded ? (
              <p>Loading vehicles...</p>
            ) : filteredCars.length > 0 ? (
              <>
                <div className="catalog-grid">
                  {paginatedCars.map((car) => {
                    const carReviews = reviewsByCar[car.id] ?? [];

                    const averageRating =
                      carReviews.length > 0
                        ? carReviews.reduce(
                            (total, review) => total + review.rating,
                            0
                          ) / carReviews.length
                        : 0;

                    const roundedRating = Math.round(averageRating);

                    return (
                      <article className="car-card" key={car.id}>
                        <Link
                          href={`/cars/${encodeURIComponent(car.id)}`}
                          className="car-image-link"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="car-image"
                            src={car.image}
                            alt={car.name}
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />

                          <span className="car-badge">
                            {car.ownerId ? "OWNER LISTING" : car.badge}
                          </span>
                        </Link>

                        <div className="car-card-body">
                          <p className="car-category">
                            {car.category} · {car.year}
                          </p>

                          <div
                            className="catalog-car-rating"
                            aria-label={
                              carReviews.length > 0
                                ? `Rated ${averageRating.toFixed(1)} out of 5 from ${carReviews.length} ${
                                    carReviews.length === 1
                                      ? "review"
                                      : "reviews"
                                  }`
                                : "No customer reviews yet"
                            }
                          >
                            {carReviews.length > 0 ? (
                              <>
                                <span
                                  className="catalog-rating-stars"
                                  aria-hidden="true"
                                >
                                  {"★".repeat(roundedRating)}
                                  {"☆".repeat(5 - roundedRating)}
                                </span>

                                <strong>{averageRating.toFixed(1)}</strong>

                                <span className="catalog-rating-count">
                                  ({carReviews.length}{" "}
                                  {carReviews.length === 1
                                    ? "review"
                                    : "reviews"}
                                  )
                                </span>
                              </>
                            ) : (
                              <span className="catalog-no-rating">
                                ☆ No reviews yet
                              </span>
                            )}
                          </div>

                          <h3>
                            <Link
                              href={`/cars/${encodeURIComponent(car.id)}`}
                            >
                              {car.name}
                            </Link>
                          </h3>

                          <p>{car.description}</p>

                          <div className="car-meta">
                            <span>{car.location}, Addis Ababa</span>
                            <span>
                              {car.seats} seats · {car.transmission}
                            </span>
                          </div>

                          <div className="car-card-footer">
                            <p>
                              <strong>
                                {car.price.toLocaleString("en-US")}
                              </strong>
                              <span> ETB / day</span>
                            </p>

                            <Link
                              href={`/cars/${encodeURIComponent(car.id)}`}
                              className="car-view-link"
                            >
                              View car ↗
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <nav
                    className="catalog-pagination"
                    aria-label="Car catalogue pages"
                  >
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      Previous
                    </button>

                    <span>
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <div className="catalog-empty">
                <h3>No vehicles found</h3>
                <p>
                  Try changing your search or adjusting your filters.
                </p>

                <button
                  type="button"
                  className="button-primary"
                  onClick={resetFilters}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
