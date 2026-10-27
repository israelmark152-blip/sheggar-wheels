
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-storage";
import {
  getAllCars,
  updateOwnerCarStatus,
} from "@/lib/car-storage";
import type { DemoUser } from "@/types/auth";
import type { Car } from "@/lib/cars";

export default function AdminListingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<DemoUser | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fadmin%2Flistings");
      return;
    }

    if (!currentUser.roles.includes("admin")) {
      router.replace("/dashboard");
      return;
    }

    setUser(currentUser);
    setCars(getAllCars());
    setReady(true);
  }, [router]);

  function changeStatus(car: Car, status: "active" | "inactive") {
    if (!user) return;

    // Seeded cars do not have owner IDs and cannot be modified here.
    if (!car.ownerId) {
      setMessage(
        "Seeded demo listings are read-only in this moderation page."
      );
      return;
    }

    const result = updateOwnerCarStatus(car.id, car.ownerId, status);

    if (!result.success) {
      setMessage(result.message || "Could not update this listing.");
      return;
    }

    setCars(getAllCars());
    setMessage(`${car.name} was set to ${status}.`);
  }

  if (!ready || !user) {
    return (
      <main className="container" style={{ padding: 32 }}>
        Loading listing moderation...
      </main>
    );
  }

  const visibleCars = cars.filter((car) => {
    if (filter === "active") return car.listingStatus === "active";
    if (filter === "inactive") return car.listingStatus === "inactive";
    if (filter === "owner") return Boolean(car.ownerId);
    return true;
  });

  const ownerListings = cars.filter((car) => Boolean(car.ownerId));
  const activeCount = ownerListings.filter(
    (car) => car.listingStatus === "active"
  ).length;
  const inactiveCount = ownerListings.filter(
    (car) => car.listingStatus === "inactive"
  ).length;

  return (
    <main className="container" style={{ padding: "36px 20px 64px" }}>
      <Link
        href="/admin"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        ← Back to Admin Dashboard
      </Link>

      <header style={{ margin: "24px 0" }}>
        <p style={{ color: "#64748b", marginBottom: 8 }}>
          ADMIN WORKSPACE / LISTINGS
        </p>
        <h1 style={{ margin: "0 0 8px" }}>Car Listing Management</h1>
        <p style={{ color: "#64748b" }}>
          Inspect platform vehicles and manage owner-created listing visibility.
        </p>
        <span
          style={{
            display: "inline-block",
            padding: "6px 10px",
            borderRadius: 999,
            background: "#fef3c7",
            color: "#92400e",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Demo data
        </span>
      </header>

      <section
        aria-label="Listing summary"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {[
          { label: "All cars", value: cars.length },
          { label: "Owner listings", value: ownerListings.length },
          { label: "Active owner listings", value: activeCount },
          { label: "Inactive owner listings", value: inactiveCount },
        ].map((item) => (
          <article
            key={item.label}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <p style={{ color: "#64748b", margin: "0 0 10px" }}>
              {item.label}
            </p>
            <strong style={{ fontSize: 28 }}>{item.value}</strong>
          </article>
        ))}
      </section>

      <section>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: 0 }}>Platform vehicles</h2>
          <label>
            <span style={{ marginRight: 8 }}>Filter:</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              style={{
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
              }}
            >
              <option value="all">All cars</option>
              <option value="owner">Owner listings</option>
              <option value="active">Active owner listings</option>
              <option value="inactive">Inactive owner listings</option>
            </select>
          </label>
        </div>

        {message && (
          <p
            role="status"
            style={{
              padding: 12,
              background: "#f1f5f9",
              borderRadius: 8,
              marginBottom: 18,
            }}
          >
            {message}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 20,
          }}
        >
          {visibleCars.map((car) => {
            const isOwnerCar = Boolean(car.ownerId);
            const isActive = car.listingStatus !== "inactive";

            return (
              <article
                key={car.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                <img
                  src={car.image}
                  alt={car.name}
                  style={{
                    display: "block",
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    background: "#f1f5f9",
                  }}
                  onError={(event) => {
                    event.currentTarget.style.visibility = "hidden";
                    event.currentTarget.style.height = "0";
                  }}
                />

                <div style={{ padding: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: "0 0 6px" }}>{car.name}</h3>
                      <p style={{ color: "#64748b", margin: 0 }}>
                        {car.category} · {car.year} · {car.location}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isOwnerCar
                        ? car.listingStatus ?? "active"
                        : "Seeded demo"}
                    </span>
                  </div>

                  <p style={{ margin: "14px 0 6px" }}>
                    <strong>{car.price.toLocaleString()} ETB</strong> / day
                  </p>
                  <p style={{ color: "#64748b", fontSize: 14 }}>
                    Owner: {car.owner}
                  </p>

                  {isOwnerCar ? (
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(car, isActive ? "inactive" : "active")
                      }
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        background: isActive ? "#fee2e2" : "#dcfce7",
                        color: isActive ? "#991b1b" : "#166534",
                        fontWeight: 600,
                      }}
                    >
                      {isActive ? "Deactivate listing" : "Activate listing"}
                    </button>
                  ) : (
                    <p
                      style={{
                        marginBottom: 0,
                        color: "#64748b",
                        fontSize: 13,
                      }}
                    >
                      Seeded listing — no moderation action available yet.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {visibleCars.length === 0 && (
          <p style={{ color: "#64748b" }}>
            No cars match this filter.
          </p>
        )}
      </section>
    </main>
  );
}
