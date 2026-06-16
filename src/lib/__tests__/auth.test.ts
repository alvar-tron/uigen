// @vitest-environment node
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "../auth";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

const COOKIE_NAME = "auth-token";

async function signValidToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

beforeEach(() => {
  cookieStore.get.mockReset();
  cookieStore.set.mockReset();
  cookieStore.delete.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("createSession signs a JWT and sets the auth cookie", async () => {
  await createSession("user-123", "test@example.com");

  expect(cookieStore.set).toHaveBeenCalledTimes(1);
  const [name, token, options] = cookieStore.set.mock.calls[0];

  expect(name).toBe(COOKIE_NAME);
  expect(typeof token).toBe("string");
  expect(token.length).toBeGreaterThan(0);
  expect(options).toMatchObject({
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession sets an expiry roughly 7 days in the future", async () => {
  const before = Date.now();
  await createSession("user-123", "test@example.com");

  const { expires } = cookieStore.set.mock.calls[0][2];
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const diff = expires.getTime() - before;

  expect(diff).toBeGreaterThan(sevenDays - 5000);
  expect(diff).toBeLessThanOrEqual(sevenDays + 5000);
});

test("createSession produces a token that getSession can read back", async () => {
  await createSession("user-123", "test@example.com");
  const token = cookieStore.set.mock.calls[0][1];

  cookieStore.get.mockReturnValue({ value: token });
  const session = await getSession();

  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("test@example.com");
});

test("getSession returns null when no cookie is present", async () => {
  cookieStore.get.mockReturnValue(undefined);

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns the payload for a valid token", async () => {
  const token = await signValidToken({
    userId: "user-1",
    email: "a@b.com",
  });
  cookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("a@b.com");
});

test("getSession returns null for a malformed token", async () => {
  cookieStore.get.mockReturnValue({ value: "not-a-real-jwt" });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for a token signed with the wrong secret", async () => {
  const wrongSecret = new TextEncoder().encode("some-other-secret");
  const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(wrongSecret);
  cookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
    .sign(JWT_SECRET);
  cookieStore.get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).toBeNull();
});

test("deleteSession removes the auth cookie", async () => {
  await deleteSession();

  expect(cookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
});

test("verifySession returns null when the request has no cookie", async () => {
  const request = new NextRequest("https://example.com");

  const session = await verifySession(request);

  expect(session).toBeNull();
});

test("verifySession returns the payload for a valid request cookie", async () => {
  const token = await signValidToken({
    userId: "user-9",
    email: "z@y.com",
  });
  const request = new NextRequest("https://example.com");
  request.cookies.set(COOKIE_NAME, token);

  const session = await verifySession(request);

  expect(session?.userId).toBe("user-9");
  expect(session?.email).toBe("z@y.com");
});

test("verifySession returns null for an invalid request cookie", async () => {
  const request = new NextRequest("https://example.com");
  request.cookies.set(COOKIE_NAME, "garbage-token");

  const session = await verifySession(request);

  expect(session).toBeNull();
});
