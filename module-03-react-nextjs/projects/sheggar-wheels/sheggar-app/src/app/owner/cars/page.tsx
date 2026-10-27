
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-storage";
import {
  getCarsForOwner,
  updateOwnerCarStatus,
} from "@/lib/car-storage";
import { getReviewsByOwner } from "@/lib/review-storage";
import type { DemoUser } from "@/types/auth";
import type { Car } from "@/lib/cars";
import type { Review } from "@/types/review";

export default function OwnerCarsPage() {
  const router = useRouter();

  const [user, setUser] = useState<DemoUser | null>(null);
  const [ownerCars, setOwnerCars] = useState<Car[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadPage = useCallback(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fowner%2Fcars");
      return;
    }

    if (
      !currentUser.roles.includes("owner") &&
      !currentUser.roles.includes("admin")
    ) {
      router.replace("/dashboard");
      return;
    }

    setUser(currentUser);
    setOwnerCars(getCarsForOwner(currentUser.id));
    setReviews(getReviewsByOwner(currentUser.id));
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadPage();

    function handleStorageChange() {
      loadPage();
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [loadPage]);

  function toggleListing(car: Car) {
    if (!user) return;

    const nextStatus =
      car.listingStatus === "active" ? "inactive" : "active";

    const result = updateOwnerCarStatus(
      car.id,
      user.id,
      nextStatus
    );

    setMessage(result.message);

    if (result.success) {
      setOwnerCars(getCarsForOwner(user.id));
    }
  }

  const activeCount = ownerCars.filter(
    (car) => car.listingStatus === "active"
  ).length;

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;

    return (
      reviews.reduce((total, review) => total + review.rating, 0) /
      reviews.length
    );
  }, [reviews]);

  const carRatings = useMemo(() => {
    return ownerCars.map((car) => {
      const carReviews = reviews.filter(
        (review) => review.carId === car.id
      );

      const average =
        carReviews.length > 0
          ? carReviews.reduce(
              (total, review) => total + review.rating,
              0
            ) / carReviews.length
          : 0;

      return {
        carId: car.id,
        count: carReviews.length,
        average,
      };
    });
  }, [ownerCars, reviews]);

  if (loading || !user) {
    return (
      <main className="dashboard-page">
        <p className="dashboard-loading">Loading your listings...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link href="/" className="auth-brand">
          sheggar<span>wheels</span>
        </Link>

        <Link href="/dashboard" className="dashboard-signout">
          Dashboard
        </Link>
      </header>

      <section className="dashboard-welcome">
        <p className="eyebrow">OWNER WORKSPACE</p>
        <h1>My car listings</h1>
        <p>Manage your vehicles, monitor ratings, and keep listings up to date.</p>
      </section>

      <nav className="owner-cars-footer" aria-label="Owner navigation">
        <Link href="/owner/cars" aria-current="page">
          My cars
        </Link>
        <Link href="/owner/bookings">Bookings</Link>
        <Link href="/owner/earnings">Earnings</Link>
        <Link href="/owner/reviews">Customer reviews</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>

      <div className="owner-cars-toolbar">
        <div className="owner-cars-stats">
          <div className="owner-cars-stat">
            <span>Total listings</span>
            <strong>{ownerCars.length}</strong>
          </div>

          <div className="owner-cars-stat">
            <span>Active listings</span>
            <strong>{activeCount}</strong>
          </div>

          <div className="owner-cars-stat">
            <span>Customer reviews</span>
            <strong>{reviews.length}</strong>
          </div>

          <div className="owner-cars-stat">
            <span>Average rating</span>
            <strong>
              {reviews.length > 0
                ? `${averageRating.toFixed(1)} / 5`
                : "—"}
            </strong>
          </div>
        </div>

        <Link
          href="/owner/cars/new"
          className="owner-add-car-button"
        >
          + Add a car
        </Link>
      </div>

      {message && (
        <p className="booking-action-message" role="status">
          {message}
        </p>
      )}

      {ownerCars.length === 0 ? (
        <section className="owner-cars-empty">
          <div className="owner-cars-empty-icon">
            <span aria-hidden="true">🚘</span>
          </div>

          <h2>You haven&apos;t listed a car yet</h2>

          <p>
            Add your first vehicle to begin building your rental
            collection.
          </p>

          <Link
            href="/owner/cars/new"
            className="primary-button"
          >
            Add your first car
          </Link>
        </section>
      ) : (
        <section className="owner-cars-grid">
          {ownerCars.map((car) => {
            const rating = carRatings.find(
              (item) => item.carId === car.id
            );

            return (
              <article className="owner-car-card" key={car.id}>
                <div className="owner-car-image-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="owner-car-image"
                    src={car.image}
                    alt={car.name}
                    loading="lazy"
                  />

                  <span
                    className={`owner-car-status ${
                      car.listingStatus === "inactive" ? "inactive" : ""
                    }`}
                  >
                    {car.listingStatus === "inactive"
                      ? "Inactive"
                      : "Active"}
                  </span>
                </div>

                <div className="owner-car-content">
                  <p className="owner-car-category">
                    {car.category} · {car.year}
                  </p>

                  <h2>{car.name}</h2>

                  <p className="owner-car-location">
                    {car.location}, Addis Ababa
                  </p>

                  <div className="owner-car-specs">
                    <span>{car.seats} seats</span>
                    <span>{car.transmission}</span>
                    <span>{car.fuel}</span>
                  </div>

                  <div className="owner-car-bottom">
                    <strong className="owner-car-price">
                      ETB {car.price.toLocaleString("en-US")}
                      <small> / day</small>
                    </strong>
                  </div>

                  <div className="owner-car-rating-summary">
                    {rating && rating.count > 0 ? (
                      <p>
                        <span aria-hidden="true">
                          {"★".repeat(Math.round(rating.average))}
                          {"☆".repeat(5 - Math.round(rating.average))}
                        </span>{" "}
                        <strong>{rating.average.toFixed(1)}</strong>{" "}
                        <span>
                          ({rating.count}{" "}
                          {rating.count === 1 ? "review" : "reviews"})
                        </span>
                      </p>
                    ) : (
                      <p>No reviews yet</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="owner-car-toggle"
                    onClick={() => toggleListing(car)}
                  >
                    {car.listingStatus === "active"
                      ? "Deactivate listing"
                      : "Activate listing"}
                  </button>

                  <Link
                    href={`/cars/${encodeURIComponent(car.id)}`}
                    className="owner-review-link"
                  >
                    View public listing
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <div className="owner-cars-footer">
        <Link href="/owner/bookings">View rental requests</Link>
        <Link href="/owner/earnings">View earnings</Link>
        <Link href="/owner/reviews">Read customer reviews</Link>
        <Link href="/dashboard">Back to dashboard</Link>
      </div>

      <section className="dashboard-notice">
        <strong>Demo project</strong>
        <p>
          Vehicle listings and review data are stored in this browser.
          Changes here do not update a remote database.
        </p>
      </section>
    </main>
  );
}
