import { ApiError } from "./api";

const priceFormatter = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" });
const dateFormatter = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" });

export function formatPrice(value: number | null): string {
  return value === null ? "—" : priceFormatter.format(value);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export type ScoreTone = "none" | "low" | "mid" | "high";

export function scoreTone(score: number | null): ScoreTone {
  if (score === null) return "none";
  if (score < 5) return "low";
  if (score < 7.5) return "mid";
  return "high";
}

export function formatScore(score: number | null): string {
  return score === null ? "—" : `${score}/10`;
}

export function messageFromError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Errore imprevisto";
}

export function importErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "listing_blocked") {
      return 'Il sito dell\'annuncio blocca il download automatico. Usa "Incolla link foto".';
    }
    if (error.code === "no_photos") return "Nessuna foto trovata nell'annuncio.";
    if (error.code === "download_failed") return "Non è stato possibile scaricare le foto.";
  }
  return messageFromError(error);
}

const MAX_PHOTO_DIMENSION = 1600;
const RECOMPRESS_THRESHOLD_BYTES = 1_500_000;

export async function preparePhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= RECOMPRESS_THRESHOLD_BYTES) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
