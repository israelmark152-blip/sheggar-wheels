
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-storage";
import {
  getBookingsForRenter,
  updateBookingStatus,
} from "@/lib/booking-storage";
import { getAllCars } from "@/lib/car-storage";
import {
  createReview,
  getReviewForBooking,
} from "@/lib/review-storage";

import type { DemoUser } from "@/types/auth";
import type { Booking, BookingStatus } from "@/types/booking";
import type { Car } from "@/lib/cars";
import type { Review } from "@/types/review";

type BookingFilter = "all" | BookingStatus;

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function canCancel(status: BookingStatus) {
  return status === "requested" || status === "confirmed";
}

function escapeCSV(value: string | number) {
  const text = String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatStars(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BookingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<DemoUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review | null>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<BookingFilter>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(
    null
  );

  const loadBookings = useCallback(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fbookings");
      return;
    }

    const renterBookings = getBookingsForRenter(currentUser.id);
    const allCars = getAllCars();

    const reviewMap: Record<string, Review | null> = {};

    renterBookings.forEach((booking) => {
      reviewMap[booking.id] = getReviewForBooking(
        booking.id,
        currentUser.id
      );
    });

    setUser(currentUser);
    setBookings(renterBookings);
    setCars(allCars);
    setReviews(reviewMap);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const filteredBookings = bookings.filter(
    (booking) =>
      statusFilter === "all" || booking.status === statusFilter
  );

  function handleExport() {
    if (!user) return;

    const renterBookings = getBookingsForRenter(user.id);

    if (renterBookings.length === 0) {
      setMessage("There are no bookings to export yet.");
      return;
    }

    const headers = [
      "Booking Reference",
      "Car",
      "Location",
      "Start Date",
      "End Date",
      "Number of Days",
      "Total Price (ETB)",
      "Booking Status",
      "Payment Status",
    ];

    const rows = renterBookings.map((booking) => {
      const car = cars.find((item) => item.id === booking.carId);

      return [
        booking.id,
        car?.name ?? "Car listing unavailable",
        car?.location ?? "Unavailable",
        booking.startDate,
        booking.endDate,
        booking.numberOfDays,
        booking.totalPrice,
        formatStatus(booking.status),
        formatStatus(booking.paymentStatus),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `sheggar-booking-history-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage("Your booking history has been exported.");
  }

  function handleCancel(bookingId: string) {
    if (!user || cancellingId !== null) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    setCancellingId(bookingId);
    setMessage("");

    const result = updateBookingStatus(
      bookingId,
      user.id,
      "cancelled"
    );

    if (result.success) {
      setMessage("Booking cancelled successfully.");
    } else {
      setMessage("Unable to cancel this booking. Please try again.");
    }

    loadBookings();
    setCancellingId(null);
  }

  function handleSubmitReview(bookingId: string) {
    if (!user || submittingReviewId !== null) return;

    const rating = ratings[bookingId] ?? 5;
    const comment = comments[bookingId] ?? "";

    setSubmittingReviewId(bookingId);
    setMessage("");

    const result = createReview({
      bookingId,
      rating,
      comment,
    });

    if (result.success) {
      setMessage(result.message);

      setRatings((previous) => {
        const next = { ...previous };
        delete next[bookingId];
        return next;
      });

      setComments((previous) => {
        const next = { ...previous };
        delete next[bookingId];
        return next;
      });

      loadBookings();
    } else {
      setMessage(result.message);
    }

    setSubmittingReviewId(null);
  }

  if (loading || !user) {
    return (
      <main className="dashboard-page">
        <p>Loading your bookings...</p>
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
        <p className="eyebrow">YOUR RENTALS</p>
        <h1>My bookings</h1>
        <p>
          Track your rental requests, booking dates, payment status, and
          reviews.
        </p>

        <button
          type="button"
          className="primary-button"
          onClick={handleExport}
        >
          Export booking history (CSV)
        </button>
      </section>

      {message && (
        <p className="booking-action-message" role="status">
          {message}
        </p>
      )}

      <section className="bookings-summary">
        <div className="bookings-summary-card">
          <span>Total bookings</span>
          <strong>{bookings.length}</strong>
        </div>

        <div className="bookings-summary-card">
          <span>Awaiting approval</span>
          <strong>
            {
              bookings.filter(
                (booking) => booking.status === "requested"
              ).length
            }
          </strong>
        </div>

        <div className="bookings-summary-card">
          <span>Confirmed</span>
          <strong>
            {
              bookings.filter(
                (booking) => booking.status === "confirmed"
              ).length
            }
          </strong>
        </div>
      </section>

      {bookings.length === 0 ? (
        <section className="bookings-empty">
          <h2>No bookings yet</h2>
          <p>When you request a car, your booking will appear here.</p>
          <Link href="/cars" className="primary-button">
            Explore cars
          </Link>
        </section>
      ) : (
        <>
          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <p className="eyebrow">FIND A RESERVATION</p>
                <h2>Filter bookings</h2>
              </div>

              <span>
                {filteredBookings.length} of {bookings.length}
              </span>
            </div>

            <label htmlFor="booking-status-filter">
              Booking status
            </label>

            <select
              id="booking-status-filter"
              className="booking-review-select"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as BookingFilter)
              }
            >
              <option value="all">All bookings</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
              <option value="cancelled">Cancelled</option>
              <option value="disputed">Disputed</option>
              <option value="resolved">Resolved</option>
            </select>
          </section>

          {filteredBookings.length === 0 ? (
            <section className="bookings-empty">
              <h2>No matching bookings</h2>
              <p>
                You don't have any {formatStatus(statusFilter)} bookings.
                Try another status or view all your bookings.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={() => setStatusFilter("all")}
              >
                Show all bookings
              </button>
            </section>
          ) : (
            <section className="bookings-list">
              {filteredBookings.map((booking) => {
                const car = cars.find(
                  (item) => item.id === booking.carId
                );
                const review = reviews[booking.id] ?? null;
                const selectedRating = ratings[booking.id] ?? 5;

                return (
                  <article
                    className="booking-list-card"
                    key={booking.id}
                  >
                    <div className="booking-list-main">
                      {car?.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="booking-car-image"
                          src={car.image}
                          alt={car.name}
                          loading="lazy"
                        />
                      )}

                      <div className="booking-list-details">
                        <span
                          className={`booking-status status-${booking.status}`}
                        >
                          {formatStatus(booking.status)}
                        </span>

                        <h2>
                          {car?.name ?? "Car listing unavailable"}
                        </h2>

                        <p className="booking-date-range">
                          {formatDate(booking.startDate)} —{" "}
                          {formatDate(booking.endDate)}
                        </p>

                        <p>
                          {booking.numberOfDays}{" "}
                          {booking.numberOfDays === 1 ? "day" : "days"}
                          {car ? ` · ${car.location}` : ""}
                        </p>

                        <p className="booking-reference">
                          Reference: {booking.id}
                        </p>

                        <Link
                          href={`/bookings/${booking.id}`}
                          className="booking-car-link"
                        >
                          View booking receipt →
                        </Link>

                        {car && (
                          <Link
                            href={`/cars/${booking.carId}`}
                            className="booking-car-link"
                          >
                            View car details →
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="booking-list-total">
                      <span className="booking-total-label">
                        Total rental price
                      </span>

                      <strong>
                        ETB {booking.totalPrice.toLocaleString("en-US")}
                      </strong>

                      <span>
                        Payment: {formatStatus(booking.paymentStatus)}
                      </span>

                      {canCancel(booking.status) && (
                        <button
                          type="button"
                          className="booking-cancel-button"
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancellingId !== null}
                        >
                          {cancellingId === booking.id
                            ? "Cancelling..."
                            : "Cancel booking"}
                        </button>
                      )}
                    </div>

                    {booking.status === "completed" && (
                      <section className="booking-review-panel">
                        {review ? (
                          <>
                            <h3>Your review</h3>

                            <p
                              className="booking-review-stars"
                              aria-label={`${review.rating} out of 5 stars`}
                            >
                              {formatStars(review.rating)}
                              <span> {review.rating}/5</span>
                            </p>

                            {review.comment && <p>{review.comment}</p>}

                            <p className="booking-review-date">
                              Submitted{" "}
                              {new Date(
                                review.createdAt
                              ).toLocaleDateString("en-ET")}
                            </p>
                          </>
                        ) : (
                          <>
                            <h3>How was your rental?</h3>
                            <p>
                              Share your experience to help other renters.
                            </p>

                            <label
                              className="booking-review-label"
                              htmlFor={`rating-${booking.id}`}
                            >
                              Your rating
                            </label>

                            <select
                              id={`rating-${booking.id}`}
                              className="booking-review-select"
                              value={selectedRating}
                              onChange={(event) =>
                                setRatings((previous) => ({
                                  ...previous,
                                  [booking.id]: Number(
                                    event.target.value
                                  ),
                                }))
                              }
                            >
                              <option value={5}>5 - Excellent</option>
                              <option value={4}>4 - Very good</option>
                              <option value={3}>3 - Good</option>
                              <option value={2}>2 - Fair</option>
                              <option value={1}>1 - Poor</option>
                            </select>

                            <label
                              className="booking-review-label"
                              htmlFor={`comment-${booking.id}`}
                            >
                              Comment (optional)
                            </label>

                            <textarea
                              id={`comment-${booking.id}`}
                              className="booking-review-textarea"
                              value={comments[booking.id] ?? ""}
                              onChange={(event) =>
                                setComments((previous) => ({
                                  ...previous,
                                  [booking.id]: event.target.value,
                                }))
                              }
                              placeholder="Tell us about the car and your rental experience..."
                              maxLength={1000}
                              rows={4}
                            />

                            <p className="booking-review-counter">
                              {(comments[booking.id] ?? "").length}/1000
                              characters
                            </p>

                            <button
                              type="button"
                              className="primary-button"
                              onClick={() =>
                                handleSubmitReview(booking.id)
                              }
                              disabled={submittingReviewId !== null}
                            >
                              {submittingReviewId === booking.id
                                ? "Submitting..."
                                : "Submit review"}
                            </button>
                          </>
                        )}
                      </section>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
}
