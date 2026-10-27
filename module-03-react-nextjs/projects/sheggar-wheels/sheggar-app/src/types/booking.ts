
export type BookingStatus =
  | "requested"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "in_progress"
  | "completed"
  | "disputed"
  | "resolved";

export type PaymentStatus =
  | "unpaid"
  | "held"
  | "refunded";

export type Booking = {
  id: string;
  carId: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  pricePerDay: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
};

export const BOOKINGS_STORAGE_KEY = "sw_bookings_v1";
