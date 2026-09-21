import { requireAuth } from "../lib/auth";
import { addPhoto, getHouse } from "../lib/houses-repo";
import { apiError, json, readJsonBody } from "../lib/http";
import {
  ListingError,
  MAX_IMPORTED_PHOTOS,
  downloadPhoto,
  extractPhotoUrlsFromPage,
  normalizePhotoUrl,
} from "../lib/listing";

const DOWNLOAD_CONCURRENCY = 5;

function sanitizeUrls(values: unknown[]): string[] {
  const urls: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = normalizePhotoUrl(value);
    if (normalized && !urls.includes(normalized)) urls.push(normalized);
    if (urls.length >= MAX_IMPORTED_PHOTOS) break;
  }
  return urls;
}

export default async function handler(req: Request): Promise<Response> {
  const authError = requireAuth(req);
  if (authError) return authError;
  if (req.method !== "POST") return apiError(405, "Method not allowed");

  const body = await readJsonBody(req);
  if (!body) return apiError(400, "Invalid JSON body");
  const houseId = typeof body.houseId === "string" ? body.houseId : "";
  if (!houseId) return apiError(400, "Missing houseId");

  const house = await getHouse(houseId);
  if (!house) return apiError(404, "House not found");

  try {
    const urls = Array.isArray(body.urls) ? sanitizeUrls(body.urls) : await extractPhotoUrlsFromPage(house.url);
    if (urls.length === 0) {
      return apiError(400, "No photos found on the listing page", "no_photos");
    }

    const alreadyImported = new Set(
      house.photos.map((photo) => photo.sourceUrl).filter((value): value is string => Boolean(value)),
    );
    const pending = urls.filter((url) => !alreadyImported.has(url));
    let skipped = urls.length - pending.length;

    if (pending.length === 0) {
      return json({ house, imported: 0, skipped });
    }

    const downloads: { file: File; sourceUrl: string }[] = [];
    for (let index = 0; index < pending.length; index += DOWNLOAD_CONCURRENCY) {
      const batch = pending.slice(index, index + DOWNLOAD_CONCURRENCY);
      const results = await Promise.allSettled(batch.map((url) => downloadPhoto(url)));
      results.forEach((result, position) => {
        if (result.status === "fulfilled" && result.value) {
          downloads.push({ file: result.value, sourceUrl: batch[position] });
        } else {
          skipped += 1;
        }
      });
    }

    if (downloads.length === 0) {
      return apiError(502, "None of the photos could be downloaded", "download_failed");
    }

    let updated = house;
    for (const item of downloads) {
      const next = await addPhoto(houseId, item.file, item.sourceUrl);
      if (!next) break;
      updated = next;
    }

    return json({ house: updated, imported: downloads.length, skipped });
  } catch (error) {
    if (error instanceof ListingError) return apiError(502, error.message, error.code);
    throw error;
  }
}
