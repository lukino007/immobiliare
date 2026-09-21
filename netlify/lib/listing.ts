import { MAX_PHOTO_BYTES } from "./houses-repo";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export const MAX_IMPORTED_PHOTOS = 24;

const IMMOBILIARE_IMAGE_URL = /^https?:\/\/[a-z0-9.-]*im-cdn\.it\/image\/\d+\//i;
const IMMOBILIARE_IMAGE_URL_GLOBAL = /https?:\/\/[a-z0-9.-]*im-cdn\.it\/image\/\d+\/[^\s"'<>\\]+/gi;
const GENERIC_IMAGE_URL = /^https?:\/\/[^\s"'<>\\]+\.(?:jpe?g|png|webp|avif)(?:\?[^\s"'<>\\]*)?$/i;
const NOISE_WORDS = ["logo", "placeholder", "avatar", "sprite", "icon", "banner", "flag"];

export class ListingError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ListingError";
    this.code = code;
  }
}

function isNoise(url: string): boolean {
  const lower = url.toLowerCase();
  return NOISE_WORDS.some((word) => lower.includes(word));
}

export function normalizePhotoUrl(raw: string): string | null {
  const url = raw.trim().replace(/&amp;/g, "&");
  if (IMMOBILIARE_IMAGE_URL.test(url)) {
    return url.replace(/(\/image\/\d+\/)[^/?#]+/i, "$1xxl.jpg");
  }
  if (GENERIC_IMAGE_URL.test(url)) return url;
  return null;
}

export function immobiliarePhotoKey(url: string): string | null {
  const match = url.match(/im-cdn\.it\/image\/(\d+)\//i);
  return match ? `im-cdn:${match[1]}` : null;
}

function collectStrings(value: unknown, out: string[], depth = 0): void {
  if (depth > 12 || out.length > 500) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out, depth + 1);
  }
}

function dedupe(candidates: string[]): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalized = normalizePhotoUrl(candidate);
    if (!normalized || isNoise(normalized)) continue;
    const key = immobiliarePhotoKey(normalized) ?? normalized;
    if (seen.has(key)) continue;
    seen.add(key);
    urls.push(normalized);
    if (urls.length >= MAX_IMPORTED_PHOTOS) break;
  }
  return urls;
}

export async function extractPhotoUrlsFromPage(pageUrl: string): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(pageUrl, {
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });
  } catch {
    throw new ListingError("Could not reach the listing page", "listing_blocked");
  }
  if (!response.ok) {
    throw new ListingError(`The listing page returned HTTP ${response.status}`, "listing_blocked");
  }
  const html = await response.text();
  if (/captcha-delivery\.com|Please enable JS and disable any ad blocker/i.test(html)) {
    throw new ListingError("The listing site blocked automated access", "listing_blocked");
  }

  const candidates: string[] = [];

  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const strings: string[] = [];
      collectStrings(JSON.parse(match[1]), strings);
      candidates.push(...strings);
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }

  for (const match of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)) {
    candidates.push(match[1]);
  }

  for (const match of html.matchAll(IMMOBILIARE_IMAGE_URL_GLOBAL)) {
    candidates.push(match[0]);
  }

  return dedupe(candidates);
}

export async function downloadPhoto(url: string): Promise<File | null> {
  let filename = "photo.jpg";
  try {
    const path = new URL(url).pathname;
    filename = decodeURIComponent(path.split("/").filter(Boolean).pop() ?? "photo.jpg").slice(0, 200) || "photo.jpg";
  } catch {
    return null;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) return null;

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_PHOTO_BYTES) return null;

  return new File([buffer], filename, { type: contentType });
}
