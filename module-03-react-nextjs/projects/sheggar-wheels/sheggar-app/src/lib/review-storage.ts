
import { getCurrentUser } from "@/lib/auth-storage";
import { getBookings } from "@/lib/booking-storage";
import { getAllCars } from "@/lib/car-storage";
import type { Booking } from "@/types/booking";
import type { Review } from "@/types/review";
import { REVIEWS_STORAGE_KEY } from "@/types/review";

export type ReviewResult = {
  success: boolean;
  message: string;
  review?: Review;
};

function isValidReview(value: unknown): value is Review {
  if (!value || typeof value !== "object") {
    return false;
  }

  const review = value as Partial<Review>;

  return (
    typeof review.id === "string" &&
    typeof review.bookingId === "string" &&
    typeof review.carId === "string" &&
    typeof review.renterId === "string" &&
    typeof review.ownerId === "string" &&
    typeof review.rating === "number" &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5 &&
    typeof review.comment === "string" &&
    typeof review.createdAt === "string" &&
    typeof review.updatedAt === "string"
  );
}

function readReviews(): Review[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(REVIEWS_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidReview);
  } catch {
    return [];
  }
}

function saveReviews(reviews: Review[]): boolean {
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    return true;
  } catch {
    return false;
  }
}

export function getAllReviews(): Review[] {
  return readReviews().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );
}

export function getReviewsForCar(carId: string): Review[] {
  return getAllReviews().filter((review) => review.carId === carId);
}

export function getReviewsByOwner(ownerId: string): Review[] {
  return getAllReviews().filter((review) => review.ownerId === ownerId);
}

export function getReviewForBooking(
  bookingId: string,
  renterId?: string
): Review | null {
  return (
    getAllReviews().find(
      (review) =>
        review.bookingId === bookingId &&
        (!renterId || review.renterId === renterId)
    ) ?? null
  );
}

export function getAverageCarRating(carId: string): {
  average: number;
  count: number;
} {
  const reviews = getReviewsForCar(carId);

  if (reviews.length === 0) {
    return { average: 0, count: 0 };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    average: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}

export function createReview(input: {
  bookingId: string;
  rating: number;
  comment: string;
}): ReviewResult {
  const user = getCurrentUser();

  if (!user) {
    return {
      success: false,
      message: "Please sign in before submitting a review.",
    };
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return {
      success: false,
      message: "Choose a rating between 1 and 5 stars.",
    };
  }

  const comment = input.comment.trim();

  if (comment.length > 1000) {
    return {
      success: false,
      message: "Your comment must be 1,000 characters or fewer.",
    };
  }

  const booking: Booking | undefined = getBookings().find(
    (item) =>
      item.id === input.bookingId &&
      item.renterId === user.id
  );

  if (!booking) {
    return {
      success: false,
      message: "This booking does not belong to your account.",
    };
  }

  if (booking.status !== "completed") {
    return {
      success: false,
      message: "You can review a car only after the rental is completed.",
    };
  }

  if (!getAllCars().some((car) => car.id === booking.carId)) {
    return {
      success: false,
      message: "The vehicle listing could not be found.",
    };
  }

  const reviews = readReviews();

  if (reviews.some((review) => review.bookingId === booking.id)) {
    return {
      success: false,
      message: "You have already reviewed this booking.",
    };
  }

  const now = new Date().toISOString();

  const review: Review = {
    id: `review_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    bookingId: booking.id,
    carId: booking.carId,
    renterId: booking.renterId,
    ownerId: booking.ownerId,
    rating: input.rating,
    comment,
    createdAt: now,
    updatedAt: now,
  };

  if (!saveReviews([...reviews, review])) {
    return {
      success: false,
      message: "Could not save your review. Check your browser storage.",
    };
  }

  return {
    success: true,
    message: "Thank you! Your review has been submitted.",
    review,
  };
}

export function getCompletedBookingsWithoutReview(
  renterId: string
): Booking[] {
  const reviewedBookingIds = new Set(
    getAllReviews().map((review) => review.bookingId)
  );

  return getBookings().filter(
    (booking) =>
      booking.renterId === renterId &&
      booking.status === "completed" &&
      !reviewedBookingIds.has(booking.id)
  );
}
