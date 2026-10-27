"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-storage";
import { getAllCars } from "@/lib/car-storage";
import { getBookings } from "@/lib/booking-storage";
import type { DemoUser } from "@/types/auth";
import type { Car } from "@/lib/cars";
import type { Booking } from "@/types/booking";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fadmin");
      return;
    }

    if (!currentUser.roles.includes("admin")) {
  router.replace("/dashboard");
  return;
    }

    setUser(currentUser);
    setCars(getAllCars());
    setBookings(getBookings());
    setReady(true);
  }, [router]);

  if (!ready || !user) {
    return (
      <main className="container" style={{ padding: "48px 20px" }}>
        Loading admin dashboard...
      </main>
    );
  }

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "requested"
  );

  const activeBookings = bookings.filter(
    (booking) =>
      booking.status === "confirmed" ||
      booking.status === "in_progress"
  );

  const disputedBookings = bookings.filter(
    (booking) => booking.status === "disputed"
  );

  const completedBookings = bookings.filter(
    (booking) => booking.status === "completed"
  );

  const stats = [
    { label: "Total cars", value: cars.length },
    { label: "Total bookings", value: bookings.length },
    { label: "Pending requests", value: pendingBookings.length },
    { label: "Active rentals", value: activeBookings.length },
    { label: "Disputed bookings", value: disputedBookings.length },
    { label: "Completed bookings", value: completedBookings.length },
  ];

  return (
    <main className="container" style={{ padding: "40px 20px 64px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
          marginBottom: 32,
        }}
      >
        <div>
          <p style={{ color: "#64748b", marginBottom: 8 }}>
            SHEGGAR WHEELS / ADMIN
          </p>
          <h1 style={{ margin: "0 0 8px" }}>Admin Dashboard</h1>
          <p style={{ color: "#64748b", margin: 0 }}>
            Welcome, {user.name}. Monitor your demo rental platform.
          </p>
        </div>

        <span
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            background: "#fef3c7",
            color: "#92400e",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Demo data
        </span>
      </div>

      <section
        aria-label="Platform statistics"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 36,
        }}
      >
        {stats.map((stat) => (
          <article
            key={stat.label}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              padding: 20,
              background: "var(--card, #ffffff)",
            }}
          >
            <p style={{ color: "#64748b", margin: "0 0 12px" }}>
              {stat.label}
            </p>
            <p
              style={{
                fontSize: 32,
                fontWeight: 700,
                margin: 0,
                color: "#0f172a",
              }}
            >
              {stat.value}
            </p>
          </article>
        ))}
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ marginBottom: 16 }}>Management workspace</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <Link
            href="/admin/listings"
            style={{
              display: "block",
              padding: 22,
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Car listings</h3>
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Review vehicle listings and manage listing status.
            </p>
          </Link>

          <Link
            href="/admin/bookings"
            style={{
              display: "block",
              padding: 22,
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <h3 style={{ marginTop: 0 }}>All bookings</h3>
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Monitor booking history and rental statuses.
            </p>
          </Link>

          <Link
            href="/admin/disputes"
            style={{
              display: "block",
              padding: 22,
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Disputes</h3>
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Review disputed bookings and resolve cases.
            </p>
          </Link>
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 16 }}>Recent bookings</h2>

        {bookings.length === 0 ? (
          <p style={{ color: "#64748b" }}>
            No bookings are available yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr>
                  {["Booking reference", "Car", "Status", "Payment"].map(
                    (heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {[...bookings].reverse().slice(0, 8).map((booking) => {
                  const car = cars.find(
                    (item) => item.id === booking.carId
                  );

                  return (
                    <tr key={booking.id}>
                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {booking.id.slice(0, 12)}
                      </td>
                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {car?.name ?? "Car unavailable"}
                      </td>
                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {booking.status.replaceAll("_", " ")}
                      </td>
                      <td
                        style={{
                          padding: 12,
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        {booking.paymentStatus.replaceAll("_", " ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}