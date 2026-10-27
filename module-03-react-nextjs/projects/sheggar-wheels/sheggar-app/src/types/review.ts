
export type Review = {
  id: string;
  bookingId: string;
  carId: string;
  renterId: string;
  ownerId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export const REVIEWS_STORAGE_KEY = "sw_reviews_v1";
