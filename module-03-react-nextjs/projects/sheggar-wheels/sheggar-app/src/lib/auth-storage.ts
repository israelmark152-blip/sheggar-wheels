
import {
  SEEDED_USERS,
  SESSION_STORAGE_KEY,
  USERS_STORAGE_KEY,
  type DemoSession,
  type DemoUser,
} from "@/types/auth";

function isBrowser() {
  return typeof window !== "undefined";
}

function isDemoUser(value: unknown): value is DemoUser {
  if (!value || typeof value !== "object") return false;

  const user = value as Partial<DemoUser>;

  return (
    typeof user.id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    Array.isArray(user.roles) &&
    user.roles.every(
      (role) =>
        role === "renter" ||
        role === "owner" ||
        role === "admin"
    ) &&
    typeof user.createdAt === "string"
  );
}

function readUsers(): DemoUser[] {
  if (!isBrowser()) return [];

  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);

    if (raw === null) {
      localStorage.setItem(
        USERS_STORAGE_KEY,
        JSON.stringify(SEEDED_USERS)
      );
      return SEEDED_USERS;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [...SEEDED_USERS];

    const validUsers = parsed.filter(isDemoUser);

    // Always retain seeded demo accounts.
    const users = [...validUsers];

    for (const seededUser of SEEDED_USERS) {
      if (!users.some((user) => user.id === seededUser.id)) {
        users.push(seededUser);
      }
    }

    return users;
  } catch {
    // Malformed browser storage must not crash the application.
    return [...SEEDED_USERS];
  }
}

export function getUsers(): DemoUser[] {
  return readUsers();
}

export function saveUser(user: DemoUser): boolean {
  if (!isBrowser() || !isDemoUser(user)) return false;

  try {
    const users = readUsers();

    if (
      users.some(
        (existing) =>
          existing.email.toLowerCase() === user.email.toLowerCase()
      )
    ) {
      return false;
    }

    localStorage.setItem(
      USERS_STORAGE_KEY,
      JSON.stringify([...users, user])
    );

    return true;
  } catch {
    return false;
  }
}

export function findUserByEmail(email: string): DemoUser | undefined {
  const normalizedEmail = email.trim().toLowerCase();

  return readUsers().find(
    (user) => user.email.toLowerCase() === normalizedEmail
  );
}

export function findUserById(id: string): DemoUser | undefined {
  return readUsers().find((user) => user.id === id);
}

export function createSession(userId: string): boolean {
  if (!isBrowser()) return false;

  // Never create a session for an unknown user.
  if (!findUserById(userId)) return false;

  try {
    const session: DemoSession = {
      userId,
      signedInAt: new Date().toISOString(),
    };

    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify(session)
    );

    return true;
  } catch {
    return false;
  }
}

export function getCurrentUser(): DemoUser | null {
  if (!isBrowser()) return null;

  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);

    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as Partial<DemoSession>).userId !== "string"
    ) {
      return null;
    }

    const session = parsed as DemoSession;

    if (
      typeof session.signedInAt !== "string" ||
      Number.isNaN(Date.parse(session.signedInAt))
    ) {
      return null;
    }

    return findUserById(session.userId) ?? null;
  } catch {
    return null;
  }
}

export function signOut(): void {
  if (!isBrowser()) return;

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Ignore browser storage failures.
  }
}
