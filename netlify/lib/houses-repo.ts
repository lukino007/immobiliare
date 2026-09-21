import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import type { House, PhotoMeta } from "../../shared/types";
import { sanitizePayload } from "./validate";

const HOUSES_STORE = "houses";
const PHOTOS_STORE = "photos";
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function housesStore() {
  return getStore({ name: HOUSES_STORE, consistency: "strong" });
}

function photosStore() {
  return getStore({ name: PHOTOS_STORE, consistency: "strong" });
}

const houseKey = (id: string) => `house/${id}`;

export const photoKey = (houseId: string, photoId: string) => `${houseId}/${photoId}`;

export async function listHouses(): Promise<House[]> {
  const store = housesStore();
  const { blobs } = await store.list({ prefix: "house/" });
  const houses = await Promise.all(
    blobs.map((blob) => store.get(blob.key, { type: "json", consistency: "strong" }) as Promise<House | null>),
  );
  return houses
    .filter((house): house is House => house !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getHouse(id: string): Promise<House | null> {
  return (await housesStore().get(houseKey(id), { type: "json", consistency: "strong" })) as House | null;
}

export async function createHouse(input: Record<string, unknown>): Promise<House> {
  const payload = sanitizePayload(input);
  const now = new Date().toISOString();
  const house: House = { id: randomUUID(), ...payload, photos: [], createdAt: now, updatedAt: now };
  await housesStore().setJSON(houseKey(house.id), house);
  return house;
}

export async function updateHouse(id: string, input: Record<string, unknown>): Promise<House | null> {
  const existing = await getHouse(id);
  if (!existing) return null;
  const payload = sanitizePayload(input);
  const updated: House = {
    ...existing,
    ...payload,
    id: existing.id,
    photos: existing.photos,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await housesStore().setJSON(houseKey(existing.id), updated);
  return updated;
}

export async function deleteHouse(id: string): Promise<boolean> {
  const existing = await getHouse(id);
  if (!existing) return false;
  await Promise.all(existing.photos.map((photo) => photosStore().delete(photoKey(id, photo.id))));
  await housesStore().delete(houseKey(id));
  return true;
}

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "photo";
  const cleaned = Array.from(base)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .slice(0, 200);
  return cleaned || "photo";
}

export async function addPhoto(houseId: string, file: File): Promise<House | null> {
  const house = await getHouse(houseId);
  if (!house) return null;
  const id = randomUUID();
  const uploadedAt = new Date().toISOString();
  const filename = sanitizeFilename(file.name);
  await photosStore().set(photoKey(houseId, id), await file.arrayBuffer(), {
    metadata: { filename, contentType: file.type, size: file.size, uploadedAt },
  });
  const photo: PhotoMeta = { id, filename, contentType: file.type, size: file.size, uploadedAt };
  const updated: House = { ...house, photos: [...house.photos, photo], updatedAt: uploadedAt };
  await housesStore().setJSON(houseKey(houseId), updated);
  return updated;
}

export async function removePhoto(houseId: string, photoId: string): Promise<House | null> {
  const house = await getHouse(houseId);
  if (!house) return null;
  if (!house.photos.some((photo) => photo.id === photoId)) return house;
  await photosStore().delete(photoKey(houseId, photoId));
  const updated: House = {
    ...house,
    photos: house.photos.filter((photo) => photo.id !== photoId),
    updatedAt: new Date().toISOString(),
  };
  await housesStore().setJSON(houseKey(houseId), updated);
  return updated;
}

export interface PhotoBinary {
  data: ArrayBuffer;
  contentType: string;
}

export async function getPhotoBinary(houseId: string, photoId: string): Promise<PhotoBinary | null> {
  const result = await photosStore().getWithMetadata(photoKey(houseId, photoId), {
    type: "arrayBuffer",
    consistency: "strong",
  });
  if (!result || result.data === null) return null;
  const metadata = result.metadata as Record<string, unknown> | undefined;
  const contentType = typeof metadata?.contentType === "string" ? metadata.contentType : "application/octet-stream";
  return { data: result.data, contentType };
}
