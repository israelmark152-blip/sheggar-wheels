
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-storage";
import { addOwnerCar } from "@/lib/car-storage";
import type { DemoUser } from "@/types/auth";
import type { Car } from "@/lib/cars";

export default function NewOwnerCarPage() {
  const router = useRouter();

  const [user, setUser] = useState<DemoUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentYear, setCurrentYear] = useState(2026);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<Car["category"]>("SUV");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("Bole");
  const [seats, setSeats] = useState("5");
  const [transmission, setTransmission] =
    useState<Car["transmission"]>("Automatic");
  const [price, setPrice] = useState("");
  const [year, setYear] = useState("2026");
  const [fuel, setFuel] = useState("Petrol");
  const [image, setImage] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    const actualYear = new Date().getFullYear();

    setCurrentYear(actualYear);
    setYear(String(actualYear));

    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.replace("/signin?next=%2Fowner%2Fcars%2Fnew");
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
    setCheckingUser(false);
  }, [router]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || saving) return;

    const numericPrice = Number(price);
    const numericSeats = Number(seats);
    const numericYear = Number(year);

    if (!name.trim() || !description.trim() || !location.trim()) {
      setError("Please complete the name, description, and location.");
      return;
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Enter a valid daily rental price.");
      return;
    }

    if (
      !Number.isInteger(numericSeats) ||
      numericSeats < 1 ||
      numericSeats > 50
    ) {
      setError("Enter a valid number of seats.");
      return;
    }

    if (
      !Number.isInteger(numericYear) ||
      numericYear < 1980 ||
      numericYear > currentYear + 1
    ) {
      setError("Enter a valid vehicle year.");
      return;
    }

    if (image.trim()) {
      try {
        const imageUrl = new URL(image.trim());

        if (
          imageUrl.protocol !== "https:" &&
          imageUrl.protocol !== "http:"
        ) {
          setError("The photo URL must start with http:// or https://.");
          return;
        }
      } catch {
        setError("Enter a valid photo URL, or leave it blank.");
        return;
      }
    }

    setSaving(true);
    setError("");

    const result = addOwnerCar(
      {
        name: name.trim(),
        category,
        description: description.trim(),
        location: location.trim(),
        seats: numericSeats,
        transmission,
        price: numericPrice,
        badge: "OWNER LISTING",
        image: image.trim(),
        year: numericYear,
        fuel,
        owner: user.name,
        details: details.trim() || description.trim(),
        listingStatus: "active",
      },
      user.id
    );

    if (!result.success) {
      setError(result.message);
      setSaving(false);
      return;
    }

    router.push("/owner/cars");
    router.refresh();
  }

  if (checkingUser || !user) {
    return (
      <main className="dashboard-page">
        <p>Checking owner access...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <Link href="/" className="auth-brand">
          sheggar<span>wheels</span>
        </Link>

        <Link href="/owner/cars" className="dashboard-signout">
          My listings
        </Link>
      </header>

      <section className="dashboard-welcome">
        <p className="eyebrow">OWNER WORKSPACE</p>
        <h1>Add a car</h1>
        <p>
          Enter the details renters need to know about your vehicle.
        </p>
      </section>

      <form className="owner-car-form" onSubmit={handleSubmit}>
        {error && (
          <p className="owner-form-error" role="alert">
            {error}
          </p>
        )}

        <div className="owner-form-grid">
          <label className="owner-form-field">
            <span>Car name *</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Toyota Corolla"
              maxLength={100}
            />
          </label>

          <label className="owner-form-field">
            <span>Vehicle category *</span>
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as Car["category"])
              }
            >
              <option value="SUV">SUV</option>
              <option value="Sedan">Sedan</option>
              <option value="Minivan">Minivan</option>
            </select>
          </label>

          <label className="owner-form-field">
            <span>Daily price (ETB) *</span>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="e.g. 3500"
            />
          </label>

          <label className="owner-form-field">
            <span>Model year *</span>
            <input
              required
              type="number"
              min="1980"
              max={currentYear + 1}
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </label>

          <label className="owner-form-field">
            <span>Pickup location *</span>
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option value="Bole">Bole</option>
              <option value="Kazanchis">Kazanchis</option>
              <option value="Sar Bet">Sar Bet</option>
              <option value="CMC">CMC</option>
              <option value="Piazza">Piazza</option>
              <option value="Megenagna">Megenagna</option>
              <option value="Lebu">Lebu</option>
              <option value="Summit">Summit</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="owner-form-field">
            <span>Number of seats *</span>
            <input
              required
              type="number"
              min="1"
              max="50"
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
            />
          </label>

          <label className="owner-form-field">
            <span>Transmission *</span>
            <select
              value={transmission}
              onChange={(event) =>
                setTransmission(
                  event.target.value as Car["transmission"]
                )
              }
            >
              <option value="Automatic">Automatic</option>
              <option value="Manual">Manual</option>
            </select>
          </label>

          <label className="owner-form-field">
            <span>Fuel type *</span>
            <select
              value={fuel}
              onChange={(event) => setFuel(event.target.value)}
            >
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Hybrid">Hybrid</option>
              <option value="Electric">Electric</option>
            </select>
          </label>

          <label className="owner-form-field owner-form-full">
            <span>Short description *</span>
            <input
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Comfortable SUV for family travel"
              maxLength={180}
            />
          </label>

          <label className="owner-form-field owner-form-full">
            <span>Vehicle photo URL (optional)</span>
            <input
              type="url"
              value={image}
              onChange={(event) => setImage(event.target.value)}
              placeholder="https://example.com/car-photo.jpg"
            />
            <small>
              Use a direct image URL. Uploading photos from your computer
              is not supported yet.
            </small>
          </label>

          <label className="owner-form-field owner-form-full">
            <span>Additional details (optional)</span>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Describe the vehicle, luggage space, or other useful details."
              rows={4}
              maxLength={1000}
            />
          </label>
        </div>

        <div className="owner-form-actions">
          <Link href="/owner/cars" className="owner-form-cancel">
            Cancel
          </Link>

          <button
            type="submit"
            className="owner-add-car-button"
            disabled={saving}
          >
            {saving ? "Saving listing..." : "Save car listing"}
          </button>
        </div>
      </form>
    </main>
  );
}
