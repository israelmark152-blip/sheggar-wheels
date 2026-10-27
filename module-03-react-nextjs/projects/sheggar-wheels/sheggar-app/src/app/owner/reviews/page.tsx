
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-storage";
import { getAllCars } from "@/lib/car-storage";
import { getReviewsByOwner } from "@/lib/review-storage";
import type { DemoUser } from "@/types/auth";
import type { Car } from "@/lib/cars";
import type { Review } from "@/types/review";

type ReviewFilter = "all" | "5" | "4" | "3" | "2" | "1";

function formatDate(date: string): string {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-ET", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function OwnerReviewsPage() {
  const router = useRouter();

  const [user, setUser] = useState<DemoUser | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");

  const loadReviews = useCallback((ownerId: string) => {
    setCars(getAllCars());
    setReviews(getReviewsByOwner(ownerId));
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();

    // Check for a missing user before accessing user properties.
    if (!currentUser) {
      router.replace("/signin?next=%2Fowner%2Freviews");
      return;
    }

    // Only vehicle owners and administrators can access this page.
    if (
      !currentUser.roles.includes("owner") &&
      !currentUser.roles.includes("admin")
    ) {
      router.replace("/dashboard");
      return;
    }

    const ownerId = currentUser.id;

    setUser(currentUser);
    loadReviews(ownerId);
    setLoading(false);

    function handleStorageChange() {
      loadReviews(ownerId);
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [router, loadReviews]);

  const ownerCars = useMemo(
    () => cars.filter((car) => car.ownerId === user?.id),
    [cars, user]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    return (
      reviews.reduce((total, review) => total + review.rating, 0) /
      reviews.length
    );
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const car = cars.find((item) => item.id === review.carId);

      const matchesRating =
        filter === "all" || review.rating === Number(filter);

      const searchableText = [
        car?.name ?? "Car listing unavailable",
        review.comment,
        review.rating.toString(),
        review.createdAt,
      ]
        .join(" ")
        .toLowerCase();

      return matchesRating && (!query || searchableText.includes(query));
    });
  }, [reviews, cars, search, filter]);

  const carRatingSummaries = useMemo(() => {
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
        car,
        count: carReviews.length,
        average,
      };
    });
  }, [ownerCars, reviews]);

  if (loading || !user) {
    return (
      <main className="dashboard-page">
        <p>Loading customer reviews...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page owner-reviews-page">
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
        <h1>Customer reviews</h1>
        <p>
          See what renters think about your vehicles and track your
          customer ratings.
        </p>
      </section>

      <section className="owner-review-summary">
        <article className="owner-cars-stat">
          <span>Total reviews</span>
          <strong>{reviews.length}</strong>
        </article>

        <article className="owner-cars-stat">
          <span>Average rating</span>
          <strong>
            {reviews.length > 0 ? `${averageRating.toFixed(1)} / 5` : "—"}
          </strong>
        </article>

        <article className="owner-cars-stat">
          <span>My vehicles</span>
          <strong>{ownerCars.length}</strong>
        </article>
      </section>

      <section className="owner-review-vehicles">
        <div className="owner-review-section-heading">
          <h2>Ratings by vehicle</h2>
          <span>{carRatingSummaries.length} vehicles</span>
        </div>

        {carRatingSummaries.length === 0 ? (
          <div className="owner-reviews-empty">
            <h3>No owner vehicles found</h3>
            <p>
              When you have vehicle listings, their customer ratings will
              appear here.
            </p>
            <Link href="/owner/cars" className="owner-review-link">
              Manage my cars
            </Link>
          </div>
        ) : (
          <div className="owner-review-vehicle-grid">
            {carRatingSummaries.map(({ car, count, average }) => (
              <article className="owner-review-vehicle-card" key={car.id}>
                <h3>{car.name}</h3>
                <p>{car.location}, Addis Ababa</p>

                {count > 0 ? (
                  <p className="owner-review-rating">
                    <span aria-hidden="true">
                      {"★".repeat(Math.round(average))}
                      {"☆".repeat(5 - Math.round(average))}
                    </span>
                    <strong>{average.toFixed(1)}</strong>
                    <span>
                      ({count} {count === 1 ? "review" : "reviews"})
                    </span>
                  </p>
                ) : (
                  <p className="owner-review-no-rating">
                    ☆ No reviews yet
                  </p>
                )}

                <Link
                  href={`/cars/${encodeURIComponent(car.id)}`}
                  className="owner-review-link"
                >
                  View listing
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="owner-review-list-section">
        <div className="owner-review-section-heading">
          <h2>All customer feedback</h2>
          <span>{filteredReviews.length} results</span>
        </div>

        <div className="owner-review-controls">
          <label>
            <span>Search reviews</span>
            <input
              type="search"
              placeholder="Search car name or comment..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label>
            <span>Filter by rating</span>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as ReviewFilter)
              }
            >
              <option value="all">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
          </label>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="owner-reviews-empty">
            <h3>
              {reviews.length === 0
                ? "No customer reviews yet"
                : "No matching reviews"}
            </h3>
            <p>
              {reviews.length === 0
                ? "Reviews from eligible completed rentals will appear here when renters submit them."
                : "Try a different search term or rating filter."}
            </p>

            {reviews.length > 0 && (
              <button
                type="button"
                className="owner-review-link"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="owner-review-list">
            {filteredReviews.map((review) => {
              const car = cars.find(
                (item) => item.id === review.carId
              );

              return (
                <article className="owner-review-card" key={review.id}>
                  <div className="owner-review-card-header">
                    <div>
                      <h3>{car?.name ?? "Car listing unavailable"}</h3>
                      <p>Reviewed on {formatDate(review.createdAt)}</p>
                    </div>

                    <div
                      className="owner-review-stars"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      <span aria-hidden="true">
                        {"★".repeat(review.rating)}
                        {"☆".repeat(5 - review.rating)}
                      </span>
                      <strong>{review.rating}/5</strong>
                    </div>
                  </div>

                  <p className="owner-review-comment">
                    {review.comment.trim()
                      ? review.comment
                      : "The renter left a rating without a written comment."}
                  </p>

                  <Link
                    href={`/cars/${encodeURIComponent(review.carId)}`}
                    className="owner-review-link"
                  >
                    View vehicle
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <nav className="owner-reviews-footer" aria-label="Owner navigation">
        <Link href="/owner/bookings">Manage bookings</Link>
        <Link href="/owner/cars">Manage my cars</Link>
        <Link href="/owner/earnings">View earnings</Link>
        <Link href="/dashboard">Return to dashboard</Link>
      </nav>

      <section className="dashboard-notice">
        <strong>Demo review data</strong>
        <p>
          Reviews are read from this browser&apos;s local storage. This
          frontend demonstration does not use a server database.
        </p>
      </section>
    </main>
  );
}
