
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { getCurrentUser } from "@/lib/auth-storage";
import { getBookingForRenter } from "@/lib/booking-storage";
import { getAllCars } from "@/lib/car-storage";
import type { Booking } from "@/types/booking";
import type { Car } from "@/lib/cars";

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);

  return parsed.toLocaleDateString("en-ET", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatETB(amount: number) {
  return `ETB ${amount.toLocaleString("en-US")}`;
}

function BookingDetailsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getCurrentUser();

    if (!user) {
      router.replace(
        `/signin?next=${encodeURIComponent(`/bookings/${params.id}`)}`
      );
      return;
    }

    const renterBooking = getBookingForRenter(params.id, user.id);

    if (!renterBooking) {
      setError("This booking could not be found in your booking history.");
      setLoading(false);
      return;
    }

    const matchingCar =
      getAllCars().find((item) => item.id === renterBooking.carId) ?? null;

    setBooking(renterBooking);
    setCar(matchingCar);
    setLoading(false);
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="dashboard-page">
        <p>Loading booking receipt...</p>
      </main>
    );
  }

  if (error || !booking) {
    return (
      <main className="dashboard-page">
        <header className="dashboard-header">
          <Link href="/" className="auth-brand">
            sheggar<span>wheels</span>
          </Link>
        </header>

        <section className="bookings-empty">
          <h1>Booking unavailable</h1>
          <p>{error || "We couldn't load this booking."}</p>
          <Link href="/bookings" className="primary-button">
            Back to my bookings
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link href="/" className="auth-brand">
          sheggar<span>wheels</span>
        </Link>

        <Link href="/bookings" className="dashboard-signout">
          My bookings
        </Link>
      </header>

      <section className="dashboard-welcome">
        <p className="eyebrow">RENTAL DETAILS</p>
        <h1>Booking receipt</h1>
        <p>
          Review your rental information, dates, total price, and current
          status.
        </p>
      </section>

      <section className="booking-receipt">
        <div className="booking-receipt-heading">
          <div>
            <p className="eyebrow">BOOKING REFERENCE</p>
            <h2>{booking.id}</h2>
          </div>

          <span className={`booking-status status-${booking.status}`}>
            {formatStatus(booking.status)}
          </span>
        </div>

        {car?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="booking-receipt-image"
            src={car.image}
            alt={car.name}
          />
        )}

        <div className="booking-receipt-section">
          <h2>Vehicle information</h2>
          <p className="booking-receipt-car-name">
            {car?.name ?? "Car listing unavailable"}
          </p>

          {car && (
            <>
              <p>{car.location}</p>
              <p>
                {car.year} · {car.category} · {car.transmission}
              </p>
            </>
          )}
        </div>

        <div className="booking-receipt-section">
          <h2>Rental schedule</h2>

          <div className="booking-receipt-row">
            <span>Pickup date</span>
            <strong>{formatDate(booking.startDate)}</strong>
          </div>

          <div className="booking-receipt-row">
            <span>Return date</span>
            <strong>{formatDate(booking.endDate)}</strong>
          </div>

          <div className="booking-receipt-row">
            <span>Rental duration</span>
            <strong>
              {booking.numberOfDays}{" "}
              {booking.numberOfDays === 1 ? "day" : "days"}
            </strong>
          </div>
        </div>

        <div className="booking-receipt-section">
          <h2>Price breakdown</h2>

          <div className="booking-receipt-row">
            <span>Daily rental price</span>
            <strong>{formatETB(booking.pricePerDay)}</strong>
          </div>

          <div className="booking-receipt-row">
            <span>Rental subtotal ({booking.numberOfDays} days)</span>
            <strong>
              {formatETB(booking.pricePerDay * booking.numberOfDays)}
            </strong>
          </div>

          <div className="booking-receipt-total">
            <span>Total rental price</span>
            <strong>{formatETB(booking.totalPrice)}</strong>
          </div>
        </div>

        <div className="booking-receipt-section">
          <h2>Payment information</h2>

          <div className="booking-receipt-row">
            <span>Payment status</span>
            <strong>{formatStatus(booking.paymentStatus)}</strong>
          </div>

          <div className="booking-receipt-row">
            <span>Booking requested</span>
            <strong>
              {new Date(booking.createdAt).toLocaleString("en-ET")}
            </strong>
          </div>

          <p className="booking-demo-notice">
            Demo receipt only. Payment is simulated; no real money has been
            charged or refunded.
          </p>
        </div>

        <div className="booking-receipt-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => window.print()}
          >
            Print receipt
          </button>

          <Link href="/bookings" className="booking-car-link">
            Back to booking history
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function BookingDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="dashboard-page">
          <p>Loading booking receipt...</p>
        </main>
      }
    >
      <BookingDetailsContent />
    </Suspense>
  );
}
