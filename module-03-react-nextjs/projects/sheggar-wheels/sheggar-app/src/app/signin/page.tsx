
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { FormEvent } from "react";
import {
  createSession,
  findUserByEmail,
} from "@/lib/auth-storage";

function SigninForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();

    const user = findUserByEmail(cleanEmail);

    if (!user) {
      setMessage(
        "No account was found with that email. Please sign up first or use a demo account."
      );
      return;
    }

    setSubmitting(true);

    const sessionCreated = createSession(user.id);

    if (!sessionCreated) {
      setMessage("We couldn't sign you in. Please try again.");
      setSubmitting(false);
      return;
    }

    const requestedDestination = searchParams.get("next");

    // Only allow safe, internal application paths.
    const safeDestination =
      requestedDestination &&
      requestedDestination.startsWith("/") &&
      !requestedDestination.startsWith("//") &&
      !requestedDestination.includes("\\")
        ? requestedDestination
        : "/dashboard";

    router.push(safeDestination);
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">
          sheggar<span>wheels</span>
        </Link>

        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in to your account</h1>

        <p className="auth-intro">
          Continue to explore cars, manage bookings, or manage your listings.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="signin-email">Email address</label>

          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            required
          />

          <p className="auth-demo-note">
            This is a demo sign-in. No password is required or stored.
          </p>

          {message && (
            <p className="auth-message" role="alert">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="primary-button"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="demo-accounts">
          <p><strong>Demo accounts</strong></p>
          <button
            type="button"
            onClick={() => setEmail("renter@sheggar.demo")}
          >
            Use demo renter
          </button>
          <button
            type="button"
            onClick={() => setEmail("owner@sheggar.demo")}
          >
            Use demo owner
          </button>
          <button
            type="button"
            onClick={() => setEmail("admin@sheggar.demo")}
          >
            Use demo admin
          </button>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link href="/signup">Create one</Link>
        </p>
      </section>
    </main>
  );
}

export default function SigninPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page">
          <section className="auth-card">
            <p>Loading sign-in...</p>
          </section>
        </main>
      }
    >
      <SigninForm />
    </Suspense>
  );
}
