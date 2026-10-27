
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, signOut } from "@/lib/auth-storage";
import { getBookings } from "@/lib/booking-storage";
import { getAllCars, getCarsForOwner } from "@/lib/car-storage";
import { getReviewsByOwner } from "@/lib/review-storage";
import type { DemoUser } from "@/types/auth";

type Booking = ReturnType<typeof getBookings>[number];

function formatETB(amount: number) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(amount);
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

function readableStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<DemoUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalCars, setTotalCars] = useState(0);
  const [ownerCarCount, setOwnerCarCount] = useState(0);
  const [ownerReviewCount, setOwnerReviewCount] = useState(0);
  const [ownerAverageRating, setOwnerAverageRating] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin");
      return;
    }

    const allBookings = getBookings();
    const allCars = getAllCars();

    setUser(currentUser);
    setBookings(allBookings);
    setTotalCars(allCars.length);
    setOwnerCarCount(getCarsForOwner(currentUser.id).length);

    if (
      currentUser.roles.includes("owner") ||
      currentUser.roles.includes("admin")
    ) {
      const reviews = getReviewsByOwner(currentUser.id);

      setOwnerReviewCount(reviews.length);
      setOwnerAverageRating(
        reviews.length
          ? reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length
          : 0
      );
    }

    setCheckingSession(false);
  }, [router]);

  function handleSignOut() {
    signOut();
    router.replace("/signin");
    router.refresh();
  }

  if (checkingSession || !user) {
    return (
      <main className="dashboard-page">
        <p className="dashboard-loading">Loading your dashboard...</p>
      </main>
    );
  }

  const isAdmin = user.roles.includes("admin");
  const isOwner = user.roles.includes("owner");
  const isRenter = user.roles.includes("renter");

  const myBookings = bookings.filter(
    (booking) => booking.renterId === user.id
  );

  const allCars = getAllCars();

  const recentBookings = [...myBookings]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 5);

  function getCarName(carId: string) {
    return (
      allCars.find((car) => car.id === carId)?.name ??
      "Car listing unavailable"
    );
  }

  const upcomingBookings = myBookings.filter((booking) =>
    ["requested", "confirmed"].includes(booking.status)
  );

  const activeBookings = myBookings.filter(
    (booking) => booking.status === "in_progress"
  );

  const completedBookings = myBookings.filter(
    (booking) => booking.status === "completed"
  );

  const cancelledBookings = myBookings.filter(
    (booking) =>
      booking.status === "cancelled" || booking.status === "declined"
  );

  const demoSpending = completedBookings.reduce(
    (total, booking) => total + booking.totalPrice,
    0
  );

  const ownerBookings = bookings.filter((booking) =>
    allCars.some(
      (car) => car.id === booking.carId && car.ownerId === user.id
    )
  );

  const pendingRequests = ownerBookings.filter(
    (booking) => booking.status === "requested"
  );

  const ownerActiveRentals = ownerBookings.filter(
    (booking) =>
      booking.status === "confirmed" ||
      booking.status === "in_progress"
  );

  const disputes = bookings.filter(
    (booking) => booking.status === "disputed"
  );

  const nextBooking = upcomingBookings
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link href="/" className="auth-brand">
          sheggar<span>wheels</span>
        </Link>

        <button
          type="button"
          className="dashboard-signout"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </header>

      <section className="dashboard-welcome">
        <p className="eyebrow">YOUR SHEGGAR SPACE</p>
        <h1>Welcome, {user.name}!</h1>
        <p>
          Manage your activity and continue your journey with
          Sheggar Wheels.
        </p>

        <div className="dashboard-role-list">
          {user.roles.map((role) => (
            <span className="dashboard-role" key={role}>
              {role === "admin"
                ? "Administrator"
                : role === "owner"
                  ? "Car owner"
                  : "Renter"}
            </span>
          ))}
        </div>
      </section>

      {isRenter && (
        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">YOUR JOURNEYS</p>
              <h2>Your rental overview</h2>
            </div>

            <Link href="/bookings" className="dashboard-tile-link">
              View all bookings →
            </Link>
          </div>

          <div className="dashboard-grid">
            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">▤</span>
              <h3>Total bookings</h3>
              <p>{myBookings.length} bookings in your history.</p>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">↗</span>
              <h3>Upcoming bookings</h3>
              <p>
                {upcomingBookings.length} requested or confirmed rentals.
              </p>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">🚘</span>
              <h3>Active trips</h3>
              <p>
                {activeBookings.length} rentals currently in progress.
              </p>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">✓</span>
              <h3>Completed trips</h3>
              <p>{completedBookings.length} completed rentals.</p>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">ETB</span>
              <h3>Demo spending</h3>
              <p>{formatETB(demoSpending)}</p>
              <small>Based on completed demo bookings.</small>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">↩</span>
              <h3>Cancelled / declined</h3>
              <p>
                {cancelledBookings.length} unsuccessful or cancelled
                requests.
              </p>
            </article>
          </div>

          {nextBooking ? (
            <article className="dashboard-notice">
              <p className="eyebrow">NEXT BOOKING</p>
              <h3>You're one step closer to your journey</h3>
              <p>
                {formatDate(nextBooking.startDate)} –{" "}
                {formatDate(nextBooking.endDate)}
              </p>
              <p>
                Booking total:{" "}
                <strong>{formatETB(nextBooking.totalPrice)}</strong>
              </p>
              <p>
                Status:{" "}
                <strong>{readableStatus(nextBooking.status)}</strong>
              </p>
              <Link
                href={`/bookings/${nextBooking.id}`}
                className="dashboard-tile-link"
              >
                View booking details →
              </Link>
            </article>
          ) : (
            <article className="dashboard-notice">
              <strong>No upcoming bookings</strong>
              <p>
                Ready for your next journey? Explore available cars and
                request a rental that suits your plans.
              </p>
              <Link href="/cars" className="dashboard-tile-link">
                Explore available cars →
              </Link>
            </article>
          )}

          <section className="dashboard-section">
            <div className="dashboard-section-heading">
              <div>
                <p className="eyebrow">YOUR ACTIVITY</p>
                <h2>Recent booking activity</h2>
              </div>

              <Link href="/bookings" className="dashboard-tile-link">
                All bookings →
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <article className="dashboard-notice">
                <h3>Your journey starts here</h3>
                <p>
                  You have no bookings yet. Explore available cars when
                  you're ready for your next trip.
                </p>
                <Link href="/cars" className="dashboard-tile-link">
                  Explore cars →
                </Link>
              </article>
            ) : (
              <div className="dashboard-grid">
                {recentBookings.map((booking) => (
                  <article className="dashboard-tile" key={booking.id}>
                    <span className="dashboard-tile-icon">🚘</span>

                    <h3>{getCarName(booking.carId)}</h3>

                    <p>
                      {formatDate(booking.startDate)} –{" "}
                      {formatDate(booking.endDate)}
                    </p>

                    <p>
                      Status:{" "}
                      <strong>{readableStatus(booking.status)}</strong>
                    </p>

                    <p>
                      Total:{" "}
                      <strong>{formatETB(booking.totalPrice)}</strong>
                    </p>

                    <Link
                      href={`/bookings/${booking.id}`}
                      className="dashboard-tile-link"
                    >
                      View booking →
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          {cancelledBookings.length > 0 && (
            <p>
              Your history includes {cancelledBookings.length} cancelled or
              declined booking
              {cancelledBookings.length === 1 ? "" : "s"}.
            </p>
          )}
        </section>
      )}

      {isOwner && (
        <section className="dashboard-section">
          <h2>Your owner overview</h2>

          <div className="dashboard-grid">
            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">▣</span>
              <h3>My cars</h3>
              <p>{ownerCarCount} owner-created listings.</p>
              <Link href="/owner/cars" className="dashboard-tile-link">
                Manage cars →
              </Link>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">◷</span>
              <h3>Pending requests</h3>
              <p>
                {pendingRequests.length} requests awaiting a decision.
              </p>
              <Link
                href="/owner/bookings"
                className="dashboard-tile-link"
              >
                Review requests →
              </Link>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">✓</span>
              <h3>Active rentals</h3>
              <p>
                {ownerActiveRentals.length} confirmed or ongoing rentals.
              </p>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">★</span>
              <h3>Customer reviews</h3>
              <p>
                {ownerReviewCount} reviews
                {ownerReviewCount
                  ? ` · ${ownerAverageRating.toFixed(1)} / 5 average`
                  : " · No ratings yet"}
              </p>
              <Link href="/owner/reviews" className="dashboard-tile-link">
                View customer reviews →
              </Link>
            </article>
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="dashboard-section">
          <h2>Platform overview</h2>

          <div className="dashboard-grid">
            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">▣</span>
              <h3>Cars</h3>
              <p>{totalCars} seeded and owner-created cars.</p>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">▤</span>
              <h3>Bookings</h3>
              <p>{bookings.length} total booking records.</p>
            </article>

            <article className="dashboard-tile">
              <span className="dashboard-tile-icon">!</span>
              <h3>Disputes</h3>
              <p>{disputes.length} disputed bookings.</p>
            </article>

            <Link href="/owner/reviews" className="dashboard-tile">
              <span className="dashboard-tile-icon">★</span>
              <h3>Customer reviews</h3>
              <p>Review customer feedback and vehicle ratings.</p>
              <span className="dashboard-tile-link">
                View reviews →
              </span>
            </Link>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>Your workspace</h2>

        <div className="dashboard-grid">
          {isRenter && (
            <>
              <Link href="/cars" className="dashboard-tile">
                <span className="dashboard-tile-icon">↗</span>
                <h3>Explore cars</h3>
                <p>Find a car that suits your next journey.</p>
                <span className="dashboard-tile-link">
                  Browse cars →
                </span>
              </Link>

              <Link href="/bookings" className="dashboard-tile">
                <span className="dashboard-tile-icon">▤</span>
                <h3>My bookings</h3>
                <p>View rental requests, trip history, and receipts.</p>
                <span className="dashboard-tile-link">
                  View bookings →
                </span>
              </Link>
            </>
          )}

          {isOwner && (
            <>
              <Link href="/owner/cars" className="dashboard-tile">
                <span className="dashboard-tile-icon">▣</span>
                <h3>My cars</h3>
                <p>Manage your vehicle listings.</p>
                <span className="dashboard-tile-link">
                  Manage cars →
                </span>
              </Link>

              <Link href="/owner/cars/new" className="dashboard-tile">
                <span className="dashboard-tile-icon">＋</span>
                <h3>List a car</h3>
                <p>Create a listing for a vehicle you own.</p>
                <span className="dashboard-tile-link">
                  Create listing →
                </span>
              </Link>

              <Link href="/owner/bookings" className="dashboard-tile">
                <span className="dashboard-tile-icon">▤</span>
                <h3>Manage booking requests</h3>
                <p>Review renter requests and reservations.</p>
                <span className="dashboard-tile-link">
                  Review requests →
                </span>
              </Link>

              <Link href="/owner/earnings" className="dashboard-tile">
                <span className="dashboard-tile-icon">↗</span>
                <h3>Earnings</h3>
                <p>Review your rental earnings summary.</p>
                <span className="dashboard-tile-link">
                  View earnings →
                </span>
              </Link>

              <Link href="/owner/reviews" className="dashboard-tile">
                <span className="dashboard-tile-icon">★</span>
                <h3>Customer reviews</h3>
                <p>Read feedback and check your vehicle ratings.</p>
                <span className="dashboard-tile-link">
                  View reviews →
                </span>
              </Link>
            </>
          )}

          {isAdmin && (
            <Link href="/admin" className="dashboard-tile">
              <span className="dashboard-tile-icon">⚙</span>
              <h3>Admin panel</h3>
              <p>Review listings, bookings, and disputes.</p>
              <span className="dashboard-tile-link">
                Open administration →
              </span>
            </Link>
          )}
        </div>
      </section>

      <section className="dashboard-notice">
        <strong>Demo project</strong>
        <p>
          Dashboard figures are calculated from browser-stored demo data.
          Payments and management features are simulated; this application
          does not process real payments.
        </p>
      </section>
    </main>
  );
}
