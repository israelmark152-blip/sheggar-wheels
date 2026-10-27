"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-storage";
import { getBookings } from "@/lib/booking-storage";
import { getAllCars } from "@/lib/car-storage";
import type { DemoUser } from "@/types/auth";
import type { Booking } from "@/types/booking";
import type { Car } from "@/lib/cars";

type MonthlyEarning = {
  key: string;
  label: string;
  amount: number;
};

function formatETB(amount: number) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeCSV(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-ET", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function OwnerEarningsPage() {
  const router = useRouter();

  const [user, setUser] = useState<DemoUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fowner%2Fearnings");
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
    setBookings(getBookings());
    setCars(getAllCars());
    setLoading(false);
  }, [router]);

  if (loading || !user) {
    return (
      <main className="dashboard-page">
        <p className="dashboard-loading">
          Loading your earnings dashboard...
        </p>
      </main>
    );
  }

  const ownerCars = cars.filter((car) => car.ownerId === user.id);
  const ownerCarIds = new Set(ownerCars.map((car) => car.id));

  const ownerBookings = bookings.filter((booking) =>
    ownerCarIds.has(booking.carId)
  );

  const pendingRequests = ownerBookings.filter(
    (booking) => booking.status === "requested"
  );

  const activeRentals = ownerBookings.filter(
    (booking) =>
      booking.status === "confirmed" ||
      booking.status === "in_progress"
  );

  const completedBookings = ownerBookings.filter(
    (booking) => booking.status === "completed"
  );

  const totalCompletedEarnings = completedBookings.reduce(
    (total, booking) => total + booking.totalPrice,
    0
  );

  const currentMonth = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, "0"),
  ].join("-");

  const thisMonthEarnings = completedBookings
    .filter((booking) => booking.endDate.startsWith(currentMonth))
    .reduce((total, booking) => total + booking.totalPrice, 0);

  const monthlyEarnings: MonthlyEarning[] = Array.from(
    { length: 6 },
    (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));

      const key = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
      ].join("-");

      const amount = completedBookings
        .filter((booking) => booking.endDate.startsWith(key))
        .reduce((total, booking) => total + booking.totalPrice, 0);

      return {
        key,
        label: date.toLocaleDateString("en", {
          month: "short",
          year: "2-digit",
        }),
        amount,
      };
    }
  );

  const maximumMonthlyEarnings = Math.max(
    1,
    ...monthlyEarnings.map((month) => month.amount)
  );

  const recentBookings = [...ownerBookings]
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 10);

  const carPerformance = ownerCars
    .map((car) => {
      const carBookings = ownerBookings.filter(
        (booking) => booking.carId === car.id
      );

      const completed = carBookings.filter(
        (booking) => booking.status === "completed"
      );

      return {
        car,
        bookingCount: carBookings.length,
        completedCount: completed.length,
        revenue: completed.reduce(
          (total, booking) => total + booking.totalPrice,
          0
        ),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  function exportEarnings() {
    const headers = [
      "Booking Reference",
      "Car",
      "Start Date",
      "End Date",
      "Days",
      "Total Price (ETB)",
      "Booking Status",
      "Payment Status",
    ];

    const rows = ownerBookings.map((booking) => {
      const car = cars.find((item) => item.id === booking.carId);

      return [
        booking.id,
        car?.name ?? "Car listing unavailable",
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

    link.href = url;
    link.download = `sheggar-owner-earnings-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setMessage(
      ownerBookings.length > 0
        ? `Exported ${ownerBookings.length} booking records.`
        : "The report is empty because your cars have no bookings yet."
    );
  }

  return (
    <main className="dashboard-page owner-earnings-page">
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
        <Link href="/owner/bookings">Bookings</Link>
        <Link
          href="/owner/earnings"
          className="active"
          aria-current="page"
        >
          Earnings
        </Link>
        <Link href="/owner/reviews">Customer reviews</Link>
        <Link href="/dashboard">Dashboard</Link>
      </nav>

      <section className="dashboard-welcome">
        <p className="eyebrow">OWNER WORKSPACE</p>
        <h1>Earnings and performance</h1>
        <p>
          Track your listings, rental activity, and estimated
          revenue from completed bookings.
        </p>

        <button
          type="button"
          className="primary-button owner-earnings-export"
          onClick={exportEarnings}
        >
          Export owner report (CSV)
        </button>
      </section>

      {message && (
        <p className="booking-action-message" role="status">
          {message}
        </p>
      )}

      <section className="dashboard-section">
        <h2>Business overview</h2>

        <div className="dashboard-grid">
          <article className="dashboard-tile">
            <span className="dashboard-tile-icon">▣</span>
            <h3>My cars</h3>
            <p>{ownerCars.length} owner-created listings.</p>
            <Link href="/owner/cars">Manage listings</Link>
          </article>

          <article className="dashboard-tile">
            <span className="dashboard-tile-icon">◷</span>
            <h3>Pending requests</h3>
            <p>{pendingRequests.length} waiting for your decision.</p>
            <Link href="/owner/bookings">Review requests</Link>
          </article>

          <article className="dashboard-tile">
            <span className="dashboard-tile-icon">↗</span>
            <h3>Active rentals</h3>
            <p>{activeRentals.length} confirmed or ongoing rentals.</p>
            <Link href="/owner/bookings">Manage rentals</Link>
          </article>

          <article className="dashboard-tile">
            <span className="dashboard-tile-icon">✓</span>
            <h3>Completed rentals</h3>
            <p>{completedBookings.length} completed bookings.</p>
          </article>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Rental earnings</h2>

        <div className="dashboard-grid">
          <article className="dashboard-tile earnings-highlight">
            <span className="dashboard-tile-icon">ETB</span>
            <h3>Completed rental total</h3>
            <p className="earnings-amount">
              {formatETB(totalCompletedEarnings)}
            </p>
            <span className="earnings-caption">
              {completedBookings.length} completed rentals
            </span>
          </article>

          <article className="dashboard-tile">
            <span className="dashboard-tile-icon">▤</span>
            <h3>This month</h3>
            <p className="earnings-amount">
              {formatETB(thisMonthEarnings)}
            </p>
            <span className="earnings-caption">
              Grouped by rental end date
            </span>
          </article>
        </div>

        <p className="booking-reference">
          These figures use completed booking totals and rental end
          dates. They are estimates from demo data, not verified payouts
          or profit.
        </p>
      </section>

      <section className="dashboard-section">
        <h2>Monthly performance</h2>
        <p>Completed rental totals over the last six calendar months.</p>

        <div
          className="dashboard-tile earnings-chart-card"
          role="img"
          aria-label="Bar chart of completed rental earnings over the last six months"
        >
          <div className="earnings-chart">
            {monthlyEarnings.map((month) => (
              <div className="earnings-chart-column" key={month.key}>
                <span className="earnings-chart-value">
                  {month.amount > 0
                    ? month.amount.toLocaleString("en-US")
                    : "—"}
                </span>

                <div className="earnings-chart-track">
                  <div
                    className="earnings-chart-bar"
                    style={{
                      height: `${Math.max(
                        month.amount > 0 ? 8 : 3,
                        (month.amount / maximumMonthlyEarnings) * 130
                      )}px`,
                      background:
                        month.amount > 0 ? "#24785b" : "#d9e2dc",
                    }}
                  />
                </div>

                <span className="earnings-chart-label">
                  {month.label}
                </span>
              </div>
            ))}
          </div>

          <p className="booking-reference">
            Values shown in ETB. Months without completed rentals
            display zero.
          </p>
        </div>

        <div className="dashboard-tile earnings-table-card">
          <h3>Monthly figures</h3>

          <div className="earnings-table-scroll">
            <table className="earnings-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Completed rentals</th>
                  <th>Rental total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyEarnings.map((month) => {
                  const count = completedBookings.filter(
                    (booking) => booking.endDate.startsWith(month.key)
                  ).length;

                  return (
                    <tr key={month.key}>
                      <td>{month.label}</td>
                      <td>{count}</td>
                      <td>{formatETB(month.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Performance by car</h2>
        <p>
          Compare completed rental revenue from each of your listings.
        </p>

        {carPerformance.length === 0 ? (
          <div className="bookings-empty">
            <h3>No car listings yet</h3>
            <p>Add a listing to start tracking its booking performance.</p>
            <Link href="/owner/cars" className="primary-button">
              Manage my cars
            </Link>
          </div>
        ) : (
          <div className="earnings-car-list">
            {carPerformance.map((item) => (
              <article className="dashboard-tile earnings-car-card" key={item.car.id}>
                <div className="earnings-car-heading">
                  <div>
                    <h3>{item.car.name}</h3>
                    <p>{item.car.location}</p>
                  </div>
                  <Link href={`/cars/${item.car.id}`}>View listing</Link>
                </div>

                <div className="earnings-car-stats">
                  <div>
                    <span>Total bookings</span>
                    <strong>{item.bookingCount}</strong>
                  </div>
                  <div>
                    <span>Completed</span>
                    <strong>{item.completedCount}</strong>
                  </div>
                  <div>
                    <span>Completed rental total</span>
                    <strong>{formatETB(item.revenue)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Recent bookings for your cars</h2>

        {recentBookings.length === 0 ? (
          <div className="bookings-empty">
            <h3>No bookings yet</h3>
            <p>
              Booking requests for your own listings will appear here.
            </p>
            <Link href="/owner/cars" className="primary-button">
              Manage my cars
            </Link>
          </div>
        ) : (
          <div className="dashboard-tile earnings-table-card">
            <div className="earnings-table-scroll">
              <table className="earnings-table">
                <thead>
                  <tr>
                    <th>Car</th>
                    <th>Rental dates</th>
                    <th>Total</th>
                    <th>Booking status</th>
                    <th>Payment status</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((booking) => {
                    const car = cars.find(
                      (item) => item.id === booking.carId
                    );

                    return (
                      <tr key={booking.id}>
                        <td>{car?.name ?? "Unavailable car"}</td>
                        <td>
                          {formatDate(booking.startDate)}
                          <span className="earnings-date-separator">–</span>
                          {formatDate(booking.endDate)}
                        </td>
                        <td>{formatETB(booking.totalPrice)}</td>
                        <td>
                          <span
                            className={`earnings-status earnings-status-${booking.status}`}
                          >
                            {formatStatus(booking.status)}
                          </span>
                        </td>
                        <td>{formatStatus(booking.paymentStatus)}</td>
                        <td>
                          <Link
                            href="/owner/bookings"
                            className="earnings-table-link"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="dashboard-notice">
        <strong>Demo earnings — not actual payouts</strong>
        <p>
          Sheggar Wheels currently stores demo data in your browser.
          These totals do not represent confirmed money transfers,
          deductions, commissions, expenses, or net profit.
        </p>
      </section>
    </main>
  );
}