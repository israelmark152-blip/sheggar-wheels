
import type { Booking, BookingStatus } from "@/types/booking";
import { BOOKINGS_STORAGE_KEY } from "@/types/booking";
import {
  findUserById,
  getCurrentUser,
} from "@/lib/auth-storage";
import { getAllCars } from "@/lib/car-storage";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

const VALID_BOOKING_STATUSES: BookingStatus[] = [
  "requested",
  "confirmed",
  "declined",
  "cancelled",
  "in_progress",
  "completed",
  "disputed",
  "resolved",
];

const VALID_PAYMENT_STATUSES = ["unpaid", "held", "refunded"] as const;

function isValidBooking(value: unknown): value is Booking {
  if (!value || typeof value !== "object") return false;

  const booking = value as Partial<Booking>;

  return (
    typeof booking.id === "string" &&
    booking.id.length > 0 &&
    typeof booking.carId === "string" &&
    typeof booking.renterId === "string" &&
    typeof booking.ownerId === "string" &&
    isValidDateString(booking.startDate) &&
    isValidDateString(booking.endDate) &&
    booking.endDate > booking.startDate &&
    typeof booking.numberOfDays === "number" &&
    Number.isInteger(booking.numberOfDays) &&
    booking.numberOfDays >= 1 &&
    booking.numberOfDays <= 60 &&
    typeof booking.pricePerDay === "number" &&
    Number.isFinite(booking.pricePerDay) &&
    booking.pricePerDay > 0 &&
    typeof booking.totalPrice === "number" &&
    Number.isFinite(booking.totalPrice) &&
    booking.totalPrice >= 0 &&
    VALID_BOOKING_STATUSES.includes(booking.status as BookingStatus) &&
    VALID_PAYMENT_STATUSES.includes(
      booking.paymentStatus as (typeof VALID_PAYMENT_STATUSES)[number]
    ) &&
    typeof booking.createdAt === "string" &&
    !Number.isNaN(Date.parse(booking.createdAt)) &&
    typeof booking.updatedAt === "string" &&
    !Number.isNaN(Date.parse(booking.updatedAt))
  );
}

export function getBookings(): Booking[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Ignore malformed records without deleting or resetting saved data.
    return parsed.filter(isValidBooking);
  } catch {
    return [];
  }
}

function saveBookings(bookings: Booking[]): boolean {
  if (!isBrowser()) return false;

  try {
    window.localStorage.setItem(
      BOOKINGS_STORAGE_KEY,
      JSON.stringify(bookings)
    );
    return true;
  } catch {
    return false;
  }
}

function failure(message: string): BookingResult {
  return { success: false, message };
}

function isActiveBooking(status: BookingStatus): boolean {
  return (
    status === "requested" ||
    status === "confirmed" ||
    status === "in_progress" ||
    status === "disputed"
  );
}

/**
 * Rental dates include the pickup date and exclude the return date.
 * Example: June 10–12 means two rental days.
 */
function datesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRentalDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();

  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function generateBookingId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `booking-${crypto.randomUUID()}`;
  }

  return `booking-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export type CreateBookingInput = {
  carId: string;
  renterId: string;
  startDate: string;
  endDate: string;
};

export type BookingResult =
  | { success: true; booking: Booking }
  | { success: false; message: string };

export function createBooking(input: CreateBookingInput): BookingResult {
  if (!isBrowser()) {
    return failure("Bookings can only be created in the browser.");
  }

  // Do not trust a renter ID supplied by the calling component.
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return failure("Please sign in before requesting a booking.");
  }

  if (input.renterId !== currentUser.id) {
    return failure("Your session does not match the renter account.");
  }

  if (!currentUser.roles.includes("renter")) {
    return failure("You must be signed in with a renter account.");
  }

  const car = getAllCars().find((item) => item.id === input.carId);

  if (!car) {
    return failure("This car could not be found.");
  }

  if (car.ownerId && car.listingStatus !== "active") {
    return failure("This listing is no longer available.");
  }

  const ownerId = car.ownerId || "user-owner-demo";
  const owner = findUserById(ownerId);

  if (!owner) {
    return failure("The car owner account could not be found.");
  }

  if (currentUser.id === owner.id) {
    return failure("You cannot book your own car.");
  }

  if (
    !isValidDateString(input.startDate) ||
    !isValidDateString(input.endDate)
  ) {
    return failure("Please select valid calendar dates.");
  }

  if (input.startDate < getTodayLocalDateString()) {
    return failure("The pickup date cannot be in the past.");
  }

  if (input.endDate <= input.startDate) {
    return failure("The return date must be after the pickup date.");
  }

  const numberOfDays = getRentalDays(input.startDate, input.endDate);

  if (numberOfDays < 1 || numberOfDays > 60) {
    return failure("Bookings must be between 1 and 60 days.");
  }

  if (
    typeof car.price !== "number" ||
    !Number.isFinite(car.price) ||
    car.price <= 0
  ) {
    return failure("This car does not have a valid daily rental price.");
  }

  const bookings = getBookings();

  const conflict = bookings.some(
    (booking) =>
      booking.carId === car.id &&
      isActiveBooking(booking.status) &&
      datesOverlap(
        input.startDate,
        input.endDate,
        booking.startDate,
        booking.endDate
      )
  );

  if (conflict) {
    return failure("This car already has a booking during those dates.");
  }

  const now = new Date().toISOString();

  const booking: Booking = {
    id: generateBookingId(),
    carId: car.id,
    renterId: currentUser.id,
    ownerId: owner.id,
    startDate: input.startDate,
    endDate: input.endDate,
    numberOfDays,
    pricePerDay: car.price,
    totalPrice: numberOfDays * car.price,
    status: "requested",
    paymentStatus: "unpaid",
    createdAt: now,
    updatedAt: now,
  };

  if (!saveBookings([...bookings, booking])) {
    return failure(
      "The booking could not be saved. Please check your browser storage and try again."
    );
  }

  return { success: true, booking };
}

export function getBookingsForRenter(renterId: string): Booking[] {
  return getBookings().filter((booking) => booking.renterId === renterId);
}

export function getBookingsForOwner(ownerId: string): Booking[] {
  return getBookings().filter((booking) => booking.ownerId === ownerId);
}

export function getBookingForRenter(
  bookingId: string,
  renterId: string
): Booking | undefined {
  return getBookings().find(
    (booking) =>
      booking.id === bookingId && booking.renterId === renterId
  );
}

export function updateBookingStatus(
  bookingId: string,
  actorId: string,
  newStatus: BookingStatus
): BookingResult {
  if (!isBrowser()) {
    return failure("Booking updates are only available in the browser.");
  }

  // Verify the active session instead of trusting the supplied actor ID.
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return failure("Please sign in before updating a booking.");
  }

  if (currentUser.id !== actorId) {
    return failure("Your session does not match this account.");
  }

  const bookings = getBookings();
  const bookingIndex = bookings.findIndex(
    (booking) => booking.id === bookingId
  );

  if (bookingIndex === -1) {
    return failure("Booking not found.");
  }

  const booking = bookings[bookingIndex];
  const isOwner = booking.ownerId === currentUser.id;
  const isRenter = booking.renterId === currentUser.id;
  const isAdmin = currentUser.roles.includes("admin");

  let allowed = false;
  let paymentStatus = booking.paymentStatus;

  // Owner approves or declines a pending request.
  if (
    isOwner &&
    booking.status === "requested" &&
    newStatus === "confirmed"
  ) {
    // Recheck conflicts when approving, in case another active booking
    // was created or the saved data changed after this request.
    const conflict = bookings.some(
      (other) =>
        other.id !== booking.id &&
        other.carId === booking.carId &&
        isActiveBooking(other.status) &&
        datesOverlap(
          booking.startDate,
          booking.endDate,
          other.startDate,
          other.endDate
        )
    );

    if (conflict) {
      return failure(
        "This booking overlaps another active booking and cannot be confirmed."
      );
    }

    allowed = true;

    // Demo-only escrow state. This does not charge a real payment method.
    paymentStatus = "held";
  }

  if (
    isOwner &&
    booking.status === "requested" &&
    newStatus === "declined"
  ) {
    allowed = true;
  }

  // Renter may cancel a request or a confirmed booking.
  if (
    isRenter &&
    (booking.status === "requested" || booking.status === "confirmed") &&
    newStatus === "cancelled"
  ) {
    allowed = true;

    if (booking.paymentStatus === "held") {
      paymentStatus = "refunded";
    }
  }

  // Owner marks a confirmed rental as in progress.
  if (
    isOwner &&
    booking.status === "confirmed" &&
    newStatus === "in_progress"
  ) {
    allowed = true;
  }

  // Owner marks an active rental as completed.
  if (
    isOwner &&
    booking.status === "in_progress" &&
    newStatus === "completed"
  ) {
    allowed = true;
  }

  // Either party can raise a dispute during an active rental.
  if (
    (isOwner || isRenter) &&
    (booking.status === "confirmed" || booking.status === "in_progress") &&
    newStatus === "disputed"
  ) {
    allowed = true;
  }

  // Admin resolves a disputed booking.
  if (
    isAdmin &&
    booking.status === "disputed" &&
    newStatus === "resolved"
  ) {
    allowed = true;
  }

  if (!allowed) {
    return failure(
      "This account is not allowed to make that booking status change."
    );
  }

  const updatedBooking: Booking = {
    ...booking,
    status: newStatus,
    paymentStatus,
    updatedAt: new Date().toISOString(),
  };

  const updatedBookings = [...bookings];
  updatedBookings[bookingIndex] = updatedBooking;

  if (!saveBookings(updatedBookings)) {
    return failure(
      "The booking update could not be saved. Please try again."
    );
  }

  return { success: true, booking: updatedBooking };
}
