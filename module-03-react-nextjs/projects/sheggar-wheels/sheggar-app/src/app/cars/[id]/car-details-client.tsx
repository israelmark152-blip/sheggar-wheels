
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { getAllCars } from "@/lib/car-storage";
import type { Car } from "@/lib/cars";
import { getCurrentUser } from "@/lib/auth-storage";
import { createBooking, getBookings } from "@/lib/booking-storage";
import { getReviewsForCar } from "@/lib/review-storage";

import type { DemoUser } from "@/types/auth";
import type { Review } from "@/types/review";

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatReviewDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString("en-ET", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatStars(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

const BLOCKING_STATUSES = [
  "requested",
  "confirmed",
  "in_progress",
  "disputed",
];

export default function CarDetailsClient({ id }: { id: string }) {
  const router = useRouter();

  const [car, setCar] = useState<Car | null>(null);
  const [carLoaded, setCarLoaded] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [user, setUser] = useState<DemoUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "error"
  );
  const [submitting, setSubmitting] = useState(false);

  // Prevents rapid repeated clicks before React updates the button.
  const submissionLock = useRef(false);

  useEffect(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    setStartDate(getLocalDateString(today));
    setEndDate(getLocalDateString(tomorrow));

    setUser(getCurrentUser());
    setAuthChecked(true);

    // Load demo cars and owner-created listings.
    const allCars = getAllCars();
    const matchingCar = allCars.find((item) => item.id === id);

    const isDemoCar = matchingCar
      ? allCars.some(
          (item) => item.id === matchingCar.id && !item.ownerId
        )
      : false;

    if (
      matchingCar &&
      (isDemoCar || matchingCar.listingStatus === "active")
    ) {
      setCar(matchingCar);

      // Load saved customer reviews for this vehicle.
      setReviews(getReviewsForCar(matchingCar.id));
    } else {
      setCar(null);
      setReviews([]);
    }

    setCarLoaded(true);
  }, [id]);

  if (!carLoaded) {
    return (
      <main className="car-detail-page">
        <p>Loading car details...</p>
      </main>
    );
  }

  if (!car) {
    return (
      <main className="car-detail-page">
        <h1>Car not found</h1>
        <p>
          This car may no longer be available, or its listing may be inactive.
        </p>
        <Link href="/cars">Browse available cars</Link>
      </main>
    );
  }

  const selectedCar: Car = car;

  const start = startDate
    ? new Date(`${startDate}T00:00:00`)
    : null;

  const end = endDate
    ? new Date(`${endDate}T00:00:00`)
    : null;

  const days =
    start && end
      ? Math.round(
          (end.getTime() - start.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  const todayString = getLocalDateString(new Date());

  const validDates =
    startDate !== "" &&
    endDate !== "" &&
    Number.isFinite(days) &&
    days >= 1 &&
    days <= 60 &&
    startDate >= todayString;

  const total = validDates ? days * selectedCar.price : 0;

  // Calculate the average rating from the saved reviews.
  const reviewCount = reviews.length;

  const averageRating =
    reviewCount > 0
      ? Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount) *
            10
        ) / 10
      : 0;

  // Check whether another active booking overlaps the selected dates.
  // The end date is treated as the return date, not an occupied night.
  const conflictingBooking = validDates
    ? getBookings().find(
        (booking) =>
          booking.carId === selectedCar.id &&
          BLOCKING_STATUSES.includes(booking.status) &&
          startDate < booking.endDate &&
          endDate > booking.startDate
      )
    : undefined;

  const datesUnavailable = Boolean(conflictingBooking);

  function handleBooking() {
    if (submissionLock.current || submitting) return;

    setMessage("");

    if (!authChecked) {
      setMessage("Please wait while we check your sign-in status.");
      setMessageType("error");
      return;
    }

    if (!user) {
      const next = `/cars/${encodeURIComponent(id)}`;
      router.push(`/signin?next=${encodeURIComponent(next)}`);
      return;
    }

    if (!user.roles.includes("renter")) {
      setMessage("This account cannot request a rental booking.");
      setMessageType("error");
      return;
    }

    if (selectedCar.ownerId === user.id) {
      setMessage("You cannot book your own car listing.");
      setMessageType("error");
      return;
    }

    if (!validDates) {
      setMessage("Choose valid dates for a rental of 1 to 60 days.");
      setMessageType("error");
      return;
    }

    // Recheck availability at submission time.
    // createBooking also performs its own final validation.
    const latestConflict = getBookings().some(
      (booking) =>
        booking.carId === selectedCar.id &&
        BLOCKING_STATUSES.includes(booking.status) &&
        startDate < booking.endDate &&
        endDate > booking.startDate
    );

    if (latestConflict) {
      setMessage(
        "These dates overlap with another booking. Please choose different dates."
      );
      setMessageType("error");
      return;
    }

    // Lock immediately, before creating the booking.
    submissionLock.current = true;
    setSubmitting(true);

    try {
      const result = createBooking({
        carId: selectedCar.id,
        renterId: user.id,
        startDate,
        endDate,
      });

      if (!result.success) {
        setMessage(result.message);
        setMessageType("error");

        submissionLock.current = false;
        setSubmitting(false);
        return;
      }

      // Keep the lock while navigating away after success.
      router.push("/bookings");
      router.refresh();
    } catch {
      setMessage(
        "Something went wrong while creating your booking. Please try again."
      );
      setMessageType("error");

      submissionLock.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="car-detail-page">
      <Link href="/cars" className="back-link">
        ← Back to cars
      </Link>

      <div className="car-detail-grid">
        <section className="car-detail-main">
          {selectedCar.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedCar.image}
              alt={selectedCar.name}
              className="car-detail-image"
              onError={(event) => {
                event.currentTarget.style.visibility = "hidden";
              }}
            />
          ) : (
            <div className="car-detail-image">
              Car photo not provided
            </div>
          )}

          <p className="eyebrow">{selectedCar.category}</p>
          <h1>{selectedCar.name}</h1>

          <p className="car-detail-location">
            {selectedCar.location}, Addis Ababa
          </p>

          {/* Customer rating summary */}
          <section
            className="car-review-summary"
            aria-label="Customer rating summary"
          >
            {reviewCount > 0 ? (
              <>
                <span className="car-review-summary-stars" aria-hidden="true">
                  {formatStars(Math.round(averageRating))}
                </span>

                <strong>{averageRating.toFixed(1)}</strong>

                <span>
                  ({reviewCount}{" "}
                  {reviewCount === 1 ? "review" : "reviews"})
                </span>
              </>
            ) : (
              <span>No reviews yet</span>
            )}
          </section>

          <p className="car-detail-description">
            {selectedCar.details}
          </p>

          <div className="detail-specs">
            <div>
              <strong>{selectedCar.year}</strong>
              <span>Year</span>
            </div>

            <div>
              <strong>{selectedCar.seats}</strong>
              <span>Seats</span>
            </div>

            <div>
              <strong>{selectedCar.transmission}</strong>
              <span>Transmission</span>
            </div>

            <div>
              <strong>{selectedCar.fuel}</strong>
              <span>Fuel</span>
            </div>
          </div>

          <div className="car-owner-note">
            <h2>About the listing</h2>
            <p>
              Listed by {selectedCar.owner}. Confirm the rental details
              before arranging your trip.
            </p>
          </div>

          {/* Customer reviews */}
          <section
            className="car-customer-reviews"
            aria-labelledby="customer-reviews-heading"
          >
            <div className="car-customer-reviews-heading">
              <div>
                <p className="eyebrow">RENTER FEEDBACK</p>
                <h2 id="customer-reviews-heading">
                  Customer reviews
                </h2>
              </div>

              {reviewCount > 0 && (
                <span className="car-review-count">
                  {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </span>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="car-no-reviews">
                <span className="car-no-reviews-icon" aria-hidden="true">
                  ☆
                </span>
                <h3>No reviews yet</h3>
                <p>
                  Be one of the first renters to share your experience with
                  this vehicle after completing a rental.
                </p>
              </div>
            ) : (
              <div className="car-reviews-list">
                {reviews.map((review) => (
                  <article
                    className="car-review-card"
                    key={review.id}
                  >
                    <div className="car-review-card-heading">
                      <span
                        className="car-review-stars"
                        aria-label={`${review.rating} out of 5 stars`}
                      >
                        {formatStars(review.rating)}
                      </span>

                      <time
                        className="car-review-date"
                        dateTime={review.createdAt}
                      >
                        {formatReviewDate(review.createdAt)}
                      </time>
                    </div>

                    <p className="car-review-rating-label">
                      {review.rating === 5
                        ? "Excellent"
                        : review.rating === 4
                          ? "Very good"
                          : review.rating === 3
                            ? "Good"
                            : review.rating === 2
                              ? "Fair"
                              : "Poor"}
                    </p>

                    {review.comment ? (
                      <p className="car-review-comment">
                        {review.comment}
                      </p>
                    ) : (
                      <p className="car-review-no-comment">
                        No written comment provided.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        <aside className="booking-card">
          <p className="booking-price">
            <strong>
              ETB {selectedCar.price.toLocaleString("en-US")}
            </strong>{" "}
            / day
          </p>

          <label htmlFor="booking-start">Pickup date</label>
          <input
            id="booking-start"
            type="date"
            value={startDate}
            min={todayString}
            onChange={(event) => {
              setStartDate(event.target.value);
              setMessage("");
            }}
            disabled={submitting}
          />

          <label htmlFor="booking-end">Return date</label>
          <input
            id="booking-end"
            type="date"
            value={endDate}
            min={startDate || todayString}
            onChange={(event) => {
              setEndDate(event.target.value);
              setMessage("");
            }}
            disabled={submitting}
          />

          {validDates && (
            <p
              className={`booking-message ${
                datesUnavailable ? "error" : "success"
              }`}
              role="status"
              aria-live="polite"
            >
              {datesUnavailable
                ? "These dates are unavailable. Please choose another range."
                : "No conflicting bookings found for these dates."}
            </p>
          )}

          <div className="booking-total">
            <span>
              {validDates
                ? `${days} rental ${days === 1 ? "day" : "days"}`
                : "Select valid dates"}
            </span>

            <strong>ETB {total.toLocaleString("en-US")}</strong>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={handleBooking}
            disabled={
              submitting ||
              !authChecked ||
              !validDates ||
              datesUnavailable
            }
          >
            {submitting
              ? "Submitting..."
              : !authChecked
                ? "Checking sign-in..."
                : datesUnavailable
                  ? "Dates unavailable"
                  : "Request booking"}
          </button>

          {message && (
            <p
              className={`booking-message ${messageType}`}
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}

          <p className="booking-disclaimer">
            Demo only. This submits a rental request; it does not charge
            a payment method.
          </p>
        </aside>
      </div>
    </main>
  );
}
