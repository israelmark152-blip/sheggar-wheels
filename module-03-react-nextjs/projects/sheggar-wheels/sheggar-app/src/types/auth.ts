
export type UserRole = "renter" | "owner" | "admin";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  createdAt: string;
};

export type DemoSession = {
  userId: string;
  signedInAt: string;
};

export const USERS_STORAGE_KEY = "sw_users_v1";
export const SESSION_STORAGE_KEY = "sw_session_v1";

export const SEEDED_USERS: DemoUser[] = [
  {
    id: "user-renter-demo",
    name: "Demo Renter",
    email: "renter@sheggar.demo",
    roles: ["renter"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-owner-demo",
    name: "Demo Owner",
    email: "owner@sheggar.demo",
    roles: ["renter", "owner"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-admin-demo",
    name: "Demo Administrator",
    email: "admin@sheggar.demo",
    roles: ["admin"],
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];
