import { randomUUID } from "node:crypto";
import {
  HOUSING_STATUS_VALUES,
  MAX_SCORE,
  emptyDetails,
  type Comment,
  type HouseDetails,
  type HousePayload,
  type HouseStatus,
} from "../../shared/types";

export class ValidationError extends Error {}

const MAX_URL_LENGTH = 2000;
const MAX_TITLE_LENGTH = 200;
const MAX_ADDRESS_LENGTH = 300;
const MAX_TAG_LENGTH = 30;
const MAX_TAGS = 30;
const MAX_COMMENT_LENGTH = 4000;
const MAX_COMMENTS = 100;
const MAX_VISIT_NOTES_LENGTH = 10000;

function asString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function asRawText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.slice(0, maxLength);
}

function asNumber(value: unknown, min: number, max: number, integer = false): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  const clamped = Math.min(Math.max(parsed, min), max);
  return integer ? Math.round(clamped) : clamped;
}

function sanitizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const entry of value) {
    const tag = asString(entry, MAX_TAG_LENGTH);
    if (tag && !tags.includes(tag)) tags.push(tag);
    if (tags.length >= MAX_TAGS) break;
  }
  return tags;
}

function sanitizeComments(value: unknown): Comment[] {
  if (!Array.isArray(value)) return [];
  const comments: Comment[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const text = asString(raw.text, MAX_COMMENT_LENGTH);
    if (!text) continue;
    comments.push({
      id: asString(raw.id, 100) || randomUUID(),
      text,
      createdAt: asString(raw.createdAt, 40) || new Date().toISOString(),
    });
    if (comments.length >= MAX_COMMENTS) break;
  }
  return comments;
}

function sanitizeDetails(value: unknown): HouseDetails {
  const details = emptyDetails();
  if (value === null || typeof value !== "object") return details;
  const raw = value as Record<string, unknown>;
  details.sizeSqm = asNumber(raw.sizeSqm, 0, 100000);
  details.rooms = asNumber(raw.rooms, 0, 100, true);
  details.floor = asNumber(raw.floor, -10, 200, true);
  details.condoFees = asNumber(raw.condoFees, 0, 100000);
  details.yearBuilt = asNumber(raw.yearBuilt, 1000, 2200, true);
  details.energyClass = asString(raw.energyClass, 20).toUpperCase();
  return details;
}

function sanitizeStatus(value: unknown): HouseStatus {
  return HOUSING_STATUS_VALUES.includes(value as HouseStatus) ? (value as HouseStatus) : "new";
}

export function sanitizePayload(input: Record<string, unknown>): HousePayload {
  const url = asString(input.url, MAX_URL_LENGTH);
  if (!url) throw new ValidationError("House URL is required");
  if (!/^https?:\/\//i.test(url)) throw new ValidationError("House URL must start with http:// or https://");

  const price = asNumber(input.price, 0, 100000000, true);
  const score = asNumber(input.score, 0, MAX_SCORE);

  return {
    url,
    title: asString(input.title, MAX_TITLE_LENGTH),
    address: asString(input.address, MAX_ADDRESS_LENGTH),
    price,
    score: score === null ? null : Math.round(score * 10) / 10,
    status: sanitizeStatus(input.status),
    tags: sanitizeTags(input.tags),
    comments: sanitizeComments(input.comments),
    visitNotes: asRawText(input.visitNotes, MAX_VISIT_NOTES_LENGTH),
    details: sanitizeDetails(input.details),
  };
}
