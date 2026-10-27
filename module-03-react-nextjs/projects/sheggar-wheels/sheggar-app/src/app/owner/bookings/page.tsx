"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, findUserById } from "@/lib/auth-storage";
import {
  getBookingsForOwner,
  updateBookingStatus,
} from "@/lib/booking-storage";
import { getAllCars } from "@/lib/car-storage";
import type { DemoUser } from "@/types/auth";
import type { Booking, BookingStatus } from "@/types/booking";
import type { Car } from "@/lib/cars";

type OwnerActionStatus =
  | "confirmed"
  | "declined"
  | "in_progress"
  | "completed";

type BookingFilter = "all" | BookingStatus;

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-ET", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatETB(amount: number): string {
  return `ETB ${amount.toLocaleString("en-US")}`;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function escapeCSV(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default function OwnerBookingsPage() {
  const router = useRouter();

  const [user, setUser] = useState<DemoUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BookingFilter>("all");

  const loadBookings = useCallback((ownerId: string) => {
    setBookings(getBookingsForOwner(ownerId));
    setCars(getAllCars());
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fowner%2Fbookings");
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
    loadBookings(currentUser.id);
    setLoading(false);
  }, [router, loadBookings]);

  function handleStatusChange(
    bookingId: string,
    newStatus: OwnerActionStatus
  ) {
    if (!user || updatingId !== null) return;

    setMessage("");
    setUpdatingId(bookingId);

    const result = updateBookingStatus(bookingId, user.id, newStatus);

    if (!result.success) {
      setMessage(result.message);
      setUpdatingId(null);
      return;
    }

    loadBookings(user.id);

    const messages: Record<OwnerActionStatus, string> = {
      confirmed:
        "Booking confirmed. Demo payment status is held; no real payment was taken.",
      declined: "Booking request declined.",
      in_progress: "Rental marked as in progress.",
      completed: "Rental marked as completed.",
    };

    setMessage(messages[newStatus]);
    setUpdatingId(null);
  }

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const car = cars.find((item) => item.id === booking.carId);
      const renter = findUserById(booking.renterId);

      const matchesFilter =
        filter === "all" || booking.status === filter;

      const searchableText = [
        booking.id,
        car?.name ?? "",
        car?.location ?? "",
        renter?.name ?? "",
        renter?.email ?? "",
        booking.status,
        booking.paymentStatus,
      ]
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!query || searchableText.includes(query));
    });
  }, [bookings, cars, filter, search]);

  function exportBookings() {
    if (!user) return;

    if (filteredBookings.length === 0) {
      setMessage("There are no matching bookings to export.");
      return;
    }

    const headers = [
      "Booking Reference",
      "Car",
      "Location",
      "Renter",
      "Renter Email",
      "Start Date",
      "End Date",
      "Duration Days",
      "Total Price ETB",
      "Booking Status",
      "Payment Status",
    ];

    const rows = filteredBookings.map((booking) => {
      const car = cars.find((item) => item.id === booking.carId);
      const renter = findUserById(booking.renterId);

      return [
        booking.id,
        car?.name ?? "Car listing unavailable",
        car?.location ?? "Unavailable",
        renter?.name ?? "Unavailable",
        renter?.email ?? "",
        booking.startDate,
        booking.endDate,
        booking.numberOfDays,
        booking.totalPrice,
        statusLabel(booking.status),
        statusLabel(booking.paymentStatus),
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
    link.href = url;
    link.download = `sheggar-owner-bookings-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage(
      `Exported ${filteredBookings.length} matching booking records.`
    );
  }

  if (loading || !user) {
    return (
      <main className="dashboard-page">
        <p>Loading owner bookings...</p>
      </main>
    );
  }

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "requested"
  );

  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "confirmed"
  );

  const activeRentals = bookings.filter(
    (booking) => booking.status === "in_progress"
  );

  function renderBookingCard(booking: Booking) {
    const car = cars.find((item) => item.id === booking.carId);
    const renter = findUserById(booking.renterId);
    const isUpdating = updatingId === booking.id;

    return (
      <article className="owner-booking-card" key={booking.id}>
        <div className="owner-booking-info">
          <span className={`owner-booking-status ${booking.status}`}>
            {statusLabel(booking.status)}
          </span>

          <h3>{car?.name ?? "Car listing unavailable"}</h3>

          <p>
            <strong>Renter:</strong>{" "}
            {renter?.name ?? "Renter account unavailable"}
          </p>

          {renter?.email && (
            <p>
              <strong>Email:</strong> {renter.email}
            </p>
          )}

          <p>
            <strong>Pickup:</strong> {formatDate(booking.startDate)}
          </p>

          <p>
            <strong>Return:</strong> {formatDate(booking.endDate)}
          </p>

          <p>
            <strong>Duration:</strong> {booking.numberOfDays}{" "}
            {booking.numberOfDays === 1 ? "day" : "days"}
          </p>

          <p className="owner-booking-reference">
            Reference: {booking.id}
          </p>
        </div>

        <div className="owner-booking-actions">
          <strong className="owner-booking-price">
            {formatETB(booking.totalPrice)}
          </strong>

          <span className="owner-booking-payment">
            Payment: {statusLabel(booking.paymentStatus)}
          </span>

          {booking.status === "requested" && (
            <>
              <button
                type="button"
                className="owner-confirm-button"
                disabled={updatingId !== null}
                onClick={() =>
                  handleStatusChange(booking.id, "confirmed")
                }
              >
                {isUpdating ? "Updating..." : "Confirm request"}
              </button>

              <button
                type="button"
                className="owner-decline-button"
                disabled={updatingId !== null}
                onClick={() =>
                  handleStatusChange(booking.id, "declined")
                }
              >
                {isUpdating ? "Updating..." : "Decline request"}
              </button>
            </>
          )}

          {booking.status === "confirmed" && (
            <button
              type="button"
              className="owner-confirm-button"
              disabled={updatingId !== null}
              onClick={() =>
                handleStatusChange(booking.id, "in_progress")
              }
            >
              {isUpdating ? "Updating..." : "Start rental"}
            </button>
          )}

          {booking.status === "in_progress" && (
            <button
              type="button"
              className="owner-confirm-button"
              disabled={updatingId !== null}
              onClick={() =>
                handleStatusChange(booking.id, "completed")
              }
            >
              {isUpdating ? "Updating..." : "Mark as completed"}
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <main className="dashboard-page owner-bookings-page">
      <header className="dashboard-header">
        <Link href="/" className="auth-brand">
          sheggar<span>wheels</span>
        </Link>

        <Link href="/dashboard" className="dashboard-signout">
          Dashboard
        </Link>
      </header>

      <nav className="owner-workspace-nav" aria-label="Owner navigation">
        <Link href="/owner/cars">My cars</Link>
        <Link href="/owner/bookings" className="active" aria-current="page">
          Bookings
        </Link>
        <Link href="/owner/earnings">Earnings</Link>
        <Link href="/owner/reviews">Customer reviews</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>

      <section className="dashboard-welcome">
        <p className="eyebrow">OWNER WORKSPACE</p>
        <h1>Rental management</h1>
        <p>Review requests and manage your rental activity.</p>
      </section>

      <section className="owner-booking-summary">
        <article className="owner-cars-stat">
          <span>Pending requests</span>
          <strong>{pendingBookings.length}</strong>
        </article>

        <article className="owner-cars-stat">
          <span>Confirmed rentals</span>
          <strong>{confirmedBookings.length}</strong>
        </article>

        <article className="owner-cars-stat">
          <span>Active rentals</span>
          <strong>{activeRentals.length}</strong>
        </article>

        <article className="owner-cars-stat">
          <span>Total bookings</span>
          <strong>{bookings.length}</strong>
        </article>
      </section>

      {message && (
        <p className="owner-booking-message" role="status">
          {message}
        </p>
      )}

      <section className="owner-booking-section">
        <div className="owner-booking-section-header">
          <h2>Find bookings</h2>
          <span>{filteredBookings.length} results</span>
        </div>

        <div className="owner-booking-filters">
          <label className="owner-booking-search">
            <span>Search by car, renter, reference, or status</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bookings..."
            />
          </label>

          <label className="owner-booking-status-filter">
            <span>Filter by status</span>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as BookingFilter)
              }
            >
              <option value="all">All statuses</option>
              <option value="requested">Requested</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
              <option value="cancelled">Cancelled</option>
              <option value="disputed">Disputed</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>

          <button
            type="button"
            className="primary-button owner-booking-export"
            onClick={exportBookings}
          >
            Export results (CSV)
          </button>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="owner-bookings-empty">
            <h3>No matching bookings</h3>
            <p>Try another search term or status filter.</p>
            <button
              type="button"
              className="owner-confirm-button"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="owner-booking-list">
            {filteredBookings.map(renderBookingCard)}
          </div>
        )}
      </section>

      <div className="owner-bookings-footer">
        <Link href="/owner/cars">Manage my cars</Link>
        <Link href="/owner/earnings">View earnings</Link>
        <Link href="/cars">Explore the car catalog</Link>
        <Link href="/dashboard">Return to dashboard</Link>
      </div>

      <section className="dashboard-notice">
        <strong>Demo booking management</strong>
        <p>
          Booking changes and payment states are simulated in browser
          storage. This frontend is for demonstration, not production
          authorization or payment processing.
        </p>
      </section>
    </main>
  );
}