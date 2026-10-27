
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-storage";
import { getBookings } from "@/lib/booking-storage";
import { getAllCars } from "@/lib/car-storage";
import type { DemoUser } from "@/types/auth";
import type { Booking } from "@/types/booking";
import type { Car } from "@/lib/cars";

export default function AdminBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [filter, setFilter] = useState("all");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fadmin%2Fbookings");
      return;
    }

    if (!currentUser.roles.includes("admin")) {
      router.replace("/dashboard");
      return;
    }

    setUser(currentUser);
    setBookings(getBookings());
    setCars(getAllCars());
    setReady(true);
  }, [router]);

  if (!ready || !user) {
    return (
      <main className="container" style={{ padding: 32 }}>
        Loading bookings...
      </main>
    );
  }

  const filteredBookings = bookings.filter((booking) => {
    return filter === "all" || booking.status === filter;
  });

  const counts = [
    { label: "All bookings", value: bookings.length },
    {
      label: "Requested",
      value: bookings.filter((b) => b.status === "requested").length,
    },
    {
      label: "Confirmed",
      value: bookings.filter((b) => b.status === "confirmed").length,
    },
    {
      label: "Disputed",
      value: bookings.filter((b) => b.status === "disputed").length,
    },
    {
      label: "Completed",
      value: bookings.filter((b) => b.status === "completed").length,
    },
  ];

  return (
    <main className="container" style={{ padding: "36px 20px 64px" }}>
      <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }}>
        ← Back to Admin Dashboard
      </Link>

      <header style={{ margin: "24px 0" }}>
        <p style={{ color: "#64748b" }}>ADMIN WORKSPACE / BOOKINGS</p>
        <h1>All Bookings</h1>
        <p style={{ color: "#64748b" }}>
          Review booking activity across Sheggar Wheels. This page displays
          demo data and does not make real payments.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {counts.map((item) => (
          <article
            key={item.label}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <p style={{ color: "#64748b", margin: "0 0 8px" }}>
              {item.label}
            </p>
            <strong style={{ fontSize: 26 }}>{item.value}</strong>
          </article>
        ))}
      </section>

      <div style={{ marginBottom: 20 }}>
        <label>
          Filter by status:{" "}
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            style={{
              padding: "10px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
            }}
          >
            <option value="all">All statuses</option>
            <option value="requested">Requested</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
      </div>

      {filteredBookings.length === 0 ? (
        <p style={{ color: "#64748b" }}>No bookings match this filter.</p>
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
                {[
                  "Reference",
                  "Car",
                  "Dates",
                  "Total",
                  "Status",
                  "Payment",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: 12,
                      borderBottom: "1px solid #cbd5e1",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const car = cars.find((item) => item.id === booking.carId);

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
                        whiteSpace: "nowrap",
                      }}
                    >
                      {booking.startDate} – {booking.endDate}
                    </td>
                    <td
                      style={{
                        padding: 12,
                        borderBottom: "1px solid #e2e8f0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {Number(booking.totalPrice).toLocaleString()} ETB
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
    </main>
  );
}
