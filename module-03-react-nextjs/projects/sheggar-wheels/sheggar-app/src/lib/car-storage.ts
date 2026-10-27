
import { cars, type Car } from "@/lib/cars";
import { findUserById, getCurrentUser } from "@/lib/auth-storage";

export const OWNER_CARS_STORAGE_KEY = "sw_owner_cars_v1";

type CarActionResult =
  | { success: true; car: Car }
  | { success: false; message: string };

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isValidCar(value: unknown): value is Car {
  if (!value || typeof value !== "object") return false;

  const car = value as Partial<Car>;

  return (
    typeof car.id === "string" &&
    typeof car.name === "string" &&
    typeof car.ownerId === "string" &&
    typeof car.category === "string" &&
    ["SUV", "Sedan", "Minivan"].includes(car.category) &&
    typeof car.description === "string" &&
    typeof car.location === "string" &&
    typeof car.seats === "number" &&
    Number.isFinite(car.seats) &&
    car.seats > 0 &&
    typeof car.transmission === "string" &&
    ["Automatic", "Manual"].includes(car.transmission) &&
    typeof car.price === "number" &&
    Number.isFinite(car.price) &&
    car.price > 0 &&
    typeof car.badge === "string" &&
    typeof car.image === "string" &&
    typeof car.year === "number" &&
    Number.isFinite(car.year) &&
    typeof car.fuel === "string" &&
    typeof car.owner === "string" &&
    typeof car.details === "string" &&
    (car.listingStatus === "active" ||
      car.listingStatus === "inactive")
  );
}

export function getOwnerCars(): Car[] {
  if (!isBrowser()) return [];

  try {
    const stored = localStorage.getItem(OWNER_CARS_STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidCar);
  } catch {
    return [];
  }
}

function saveOwnerCars(ownerCars: Car[]): boolean {
  if (!isBrowser()) return false;

  try {
    localStorage.setItem(
      OWNER_CARS_STORAGE_KEY,
      JSON.stringify(ownerCars)
    );
    return true;
  } catch {
    return false;
  }
}

export function getAllCars(): Car[] {
  const demoIds = new Set(cars.map((car) => car.id));

  const ownerCars = getOwnerCars().filter(
    (car) => !demoIds.has(car.id)
  );

  return [...cars, ...ownerCars];
}

export function getCarsForOwner(ownerId: string): Car[] {
  return getOwnerCars().filter((car) => car.ownerId === ownerId);
}

export function addOwnerCar(
  carData: Omit<Car, "id" | "ownerId">,
  ownerId: string
): CarActionResult {
  if (!isBrowser()) {
    return {
      success: false,
      message: "Listings can only be saved in a browser.",
    };
  }

  const currentUser = getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      message: "Please sign in before creating a listing.",
    };
  }

  if (currentUser.id !== ownerId) {
    return {
      success: false,
      message: "Your session does not match this owner account.",
    };
  }

  if (
    !currentUser.roles.includes("owner") &&
    !currentUser.roles.includes("admin")
  ) {
    return {
      success: false,
      message: "You must have an owner account to create a listing.",
    };
  }

  if (!findUserById(ownerId)) {
    return {
      success: false,
      message: "Owner account not found.",
    };
  }

  if (
    typeof carData.name !== "string" ||
    !carData.name.trim() ||
    typeof carData.location !== "string" ||
    !carData.location.trim() ||
    typeof carData.description !== "string" ||
    !carData.description.trim() ||
    !Number.isFinite(carData.price) ||
    carData.price <= 0 ||
    !Number.isInteger(carData.year) ||
    carData.year < 1900 ||
    carData.year > new Date().getFullYear() + 1 ||
    !Number.isInteger(carData.seats) ||
    carData.seats < 1
  ) {
    return {
      success: false,
      message: "Please enter valid car details, location, price, year, and seats.",
    };
  }

  const id =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? `owner-car-${crypto.randomUUID()}`
      : `owner-car-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const newCar: Car = {
    ...carData,
    id,
    ownerId: currentUser.id,
    listingStatus: "active",
  };

  const ownerCars = getOwnerCars();

  if (!saveOwnerCars([...ownerCars, newCar])) {
    return {
      success: false,
      message: "Unable to save this listing. Check browser storage.",
    };
  }

  return { success: true, car: newCar };
}

export function updateOwnerCarStatus(
  carId: string,
  ownerId: string,
  listingStatus: "active" | "inactive"
): { success: boolean; message: string } {
  if (!isBrowser()) {
    return {
      success: false,
      message: "Listings can only be updated in a browser.",
    };
  }

  const currentUser = getCurrentUser();

  if (!currentUser) {
    return {
      success: false,
      message: "Please sign in before managing listings.",
    };
  }

  if (currentUser.id !== ownerId) {
    return {
      success: false,
      message: "Your session does not match this owner account.",
    };
  }

  if (
    !currentUser.roles.includes("owner") &&
    !currentUser.roles.includes("admin")
  ) {
    return {
      success: false,
      message: "You do not have permission to manage listings.",
    };
  }

  const ownerCars = getOwnerCars();

  const index = ownerCars.findIndex(
    (car) => car.id === carId && car.ownerId === currentUser.id
  );

  if (index === -1) {
    return {
      success: false,
      message: "Listing not found or you do not own this car.",
    };
  }

  const updatedCars = [...ownerCars];

  updatedCars[index] = {
    ...updatedCars[index],
    listingStatus,
  };

  if (!saveOwnerCars(updatedCars)) {
    return {
      success: false,
      message: "Unable to update this listing.",
    };
  }

  return {
    success: true,
    message:
      listingStatus === "active"
        ? "Listing activated."
        : "Listing deactivated.",
  };
}
