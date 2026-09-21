import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { apiError } from "./http";

const COOKIE_NAME = "immobiliare_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_SECRET_LENGTH = 16;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error("SESSION_SECRET environment variable is missing or too short (min 16 characters)");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | null): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const given = Buffer.from(signature);
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed === null || typeof parsed !== "object") return false;
    const exp = (parsed as { exp?: unknown }).exp;
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export function checkPassword(input: unknown): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new Error("APP_PASSWORD environment variable is missing");
  }
  if (typeof input !== "string" || input.length === 0) return false;
  const givenHash = createHash("sha256").update(input).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(givenHash, expectedHash);
}

function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies[name] = decodeURIComponent(value);
  }
  return cookies;
}

export function isAuthenticated(req: Request): boolean {
  const cookies = parseCookies(req.headers.get("cookie"));
  return verifySessionToken(cookies[COOKIE_NAME] ?? null);
}

export function requireAuth(req: Request): Response | null {
  return isAuthenticated(req) ? null : apiError(401, "Authentication required");
}

function cookieAttributes(req: Request): string {
  const attributes = ["Path=/", "HttpOnly", "SameSite=Lax"];
  if (new URL(req.url).protocol === "https:") attributes.push("Secure");
  return attributes.join("; ");
}

export function sessionCookie(req: Request, token: string): string {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieAttributes(req)}; Max-Age=${maxAge}`;
}

export function clearSessionCookie(req: Request): string {
  return `${COOKIE_NAME}=; ${cookieAttributes(req)}; Max-Age=0`;
}
