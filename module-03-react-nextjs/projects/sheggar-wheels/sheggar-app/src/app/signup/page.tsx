
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { saveUser, findUserByEmail, createSession } from "@/lib/auth-storage";
import type { DemoUser, UserRole } from "@/types/auth";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"renter" | "owner">("renter");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setMessage("Please enter a name with at least two characters.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (findUserByEmail(cleanEmail)) {
      setMessage("An account with this email already exists. Please sign in.");
      return;
    }

    setSubmitting(true);

    const roles: UserRole[] =
      role === "owner" ? ["renter", "owner"] : ["renter"];

    const newUser: DemoUser = {
      id: `user-${crypto.randomUUID()}`,
      name: cleanName,
      email: cleanEmail,
      roles,
      createdAt: new Date().toISOString(),
    };

    const saved = saveUser(newUser);

    if (!saved) {
      setMessage("We couldn't create your account. Please try again.");
      setSubmitting(false);
      return;
    }

    const sessionCreated = createSession(newUser.id);

    if (!sessionCreated) {
      setMessage("Your account was created, but sign-in failed. Please sign in.");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand">
          sheggar<span>wheels</span>
        </Link>

        <p className="eyebrow">WELCOME TO SHEGGAR WHEELS</p>
        <h1>Create your account</h1>
        <p className="auth-intro">
          Join the community to discover cars or share your car with renters.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
            minLength={2}
            maxLength={80}
            required
          />

          <label htmlFor="signup-email">Email address</label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            required
          />

          <label htmlFor="signup-role">How will you use Sheggar Wheels?</label>
          <select
            id="signup-role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "renter" | "owner")
            }
          >
            <option value="renter">I want to rent cars</option>
            <option value="owner">I want to rent and list my car</option>
          </select>

          <p className="auth-demo-note">
            This educational demo doesn't ask for or store a password.
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
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link href="/signin">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
