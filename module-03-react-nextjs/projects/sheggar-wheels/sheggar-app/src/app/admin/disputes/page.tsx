
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-storage";
import {
  getBookings,
  updateBookingStatus,
} from "@/lib/booking-storage";
import { getAllCars } from "@/lib/car-storage";
import type { DemoUser } from "@/types/auth";
import type { Booking } from "@/types/booking";
import type { Car } from "@/lib/cars";

export default function AdminDisputesPage() {
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fadmin%2Fdisputes");
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

  function resolveDispute(booking: Booking) {
    if (!user) return;

    const note = notes[booking.id]?.trim();

    if (!note) {
      setMessages((previous) => ({
        ...previous,
        [booking.id]: "Please enter a resolution note before resolving.",
      }));
      return;
    }

    const result = updateBookingStatus(
      booking.id,
      user.id,
      "resolved"
    );

    if (!result.success) {
      setMessages((previous) => ({
        ...previous,
        [booking.id]:
          result.message || "Unable to resolve this dispute.",
      }));
      return;
    }

    setBookings(getBookings());
    setMessages((previous) => ({
      ...previous,
      [booking.id]:
        "Dispute resolved. Note: this demo does not persist resolution notes.",
    }));
    setNotes((previous) => ({
      ...previous,
      [booking.id]: "",
    }));
  }

  if (!ready || !user) {
    return (
      <main className="container" style={{ padding: 32 }}>
        Loading disputes...
      </main>
    );
  }

  const disputes = bookings.filter(
    (booking) => booking.status === "disputed"
  );

  const resolvedCount = bookings.filter(
    (booking) => booking.status === "resolved"
  ).length;

  return (
    <main className="container" style={{ padding: "36px 20px 64px" }}>
      <Link
        href="/admin"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        ← Back to Admin Dashboard
      </Link>

      <header style={{ margin: "24px 0 28px" }}>
        <p style={{ color: "#64748b" }}>ADMIN WORKSPACE / DISPUTES</p>
        <h1>Dispute Resolution</h1>
        <p style={{ color: "#64748b" }}>
          Review disputed bookings and record a resolution note before
          changing a dispute’s status. This is a demo workflow.
        </p>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <article
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <p style={{ color: "#64748b", margin: "0 0 8px" }}>
            Open disputes
          </p>
          <strong style={{ fontSize: 30 }}>{disputes.length}</strong>
        </article>

        <article
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 20,
          }}
        >
          <p style={{ color: "#64748b", margin: "0 0 8px" }}>
            Resolved bookings
          </p>
          <strong style={{ fontSize: 30 }}>{resolvedCount}</strong>
        </article>
      </section>

      {disputes.length === 0 ? (
        <section
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 16,
            padding: 28,
          }}
        >
          <h2 style={{ marginTop: 0 }}>No open disputes</h2>
          <p style={{ color: "#64748b" }}>
            There are no bookings with disputed status right now. When a
            renter or owner reports a dispute, it will appear here.
          </p>
          <Link href="/admin/bookings">View all bookings →</Link>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 20 }}>
          {disputes.map((booking) => {
            const car = cars.find((item) => item.id === booking.carId);

            return (
              <article
                key={booking.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h2 style={{ margin: "0 0 8px" }}>
                      {car?.name ?? "Car unavailable"}
                    </h2>
                    <p style={{ color: "#64748b", margin: 0 }}>
                      Booking reference: {booking.id}
                    </p>
                  </div>

                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#fee2e2",
                      color: "#991b1b",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    DISPUTED
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: 12,
                    margin: "20px 0",
                  }}
                >
                  <div>
                    <p style={{ color: "#64748b", margin: "0 0 4px" }}>
                      Rental dates
                    </p>
                    <strong>
                      {booking.startDate} – {booking.endDate}
                    </strong>
                  </div>

                  <div>
                    <p style={{ color: "#64748b", margin: "0 0 4px" }}>
                      Booking total
                    </p>
                    <strong>
                      {Number(booking.totalPrice).toLocaleString()} ETB
                    </strong>
                  </div>

                  <div>
                    <p style={{ color: "#64748b", margin: "0 0 4px" }}>
                      Payment status
                    </p>
                    <strong>
                      {booking.paymentStatus.replaceAll("_", " ")}
                    </strong>
                  </div>
                </div>

                <label
                  htmlFor={`note-${booking.id}`}
                  style={{
                    display: "block",
                    fontWeight: 600,
                    marginBottom: 8,
                  }}
                >
                  Resolution note
                </label>

                <textarea
                  id={`note-${booking.id}`}
                  value={notes[booking.id] ?? ""}
                  onChange={(event) =>
                    setNotes((previous) => ({
                      ...previous,
                      [booking.id]: event.target.value,
                    }))
                  }
                  placeholder="Describe the decision and any agreed next steps..."
                  rows={3}
                  style={{
                    display: "block",
                    width: "100%",
                    boxSizing: "border-box",
                    padding: 12,
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    marginBottom: 12,
                    font: "inherit",
                  }}
                />

                <button
                  type="button"
                  onClick={() => resolveDispute(booking)}
                  style={{
                    padding: "11px 16px",
                    border: "none",
                    borderRadius: 8,
                    background: "#0f172a",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Mark as resolved
                </button>

                {messages[booking.id] && (
                  <p role="status" style={{ marginBottom: 0 }}>
                    {messages[booking.id]}
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
