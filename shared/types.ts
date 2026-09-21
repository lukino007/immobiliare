export type HouseStatus =
  | "new"
  | "to_visit"
  | "visit_scheduled"
  | "visited"
  | "favorite"
  | "offer"
  | "discarded";

export interface HouseStatusInfo {
  value: HouseStatus;
  label: string;
  color: string;
}

export const HOUSE_STATUSES: HouseStatusInfo[] = [
  { value: "new", label: "Da valutare", color: "#64748b" },
  { value: "to_visit", label: "Da visitare", color: "#0284c7" },
  { value: "visit_scheduled", label: "Visita fissata", color: "#7c3aed" },
  { value: "visited", label: "Visitata", color: "#0d9488" },
  { value: "favorite", label: "Preferita", color: "#d97706" },
  { value: "offer", label: "Offerta", color: "#dc2626" },
  { value: "discarded", label: "Scartata", color: "#94a3b8" },
];

export const HOUSING_STATUS_VALUES: HouseStatus[] = HOUSE_STATUSES.map((status) => status.value);

export function statusInfo(status: HouseStatus): HouseStatusInfo {
  return HOUSE_STATUSES.find((info) => info.value === status) ?? HOUSE_STATUSES[0];
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

export interface PhotoMeta {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  sourceUrl?: string;
}

export interface HouseDetails {
  sizeSqm: number | null;
  rooms: number | null;
  floor: number | null;
  condoFees: number | null;
  yearBuilt: number | null;
  energyClass: string;
}

export interface House {
  id: string;
  url: string;
  title: string;
  address: string;
  price: number | null;
  score: number | null;
  status: HouseStatus;
  tags: string[];
  comments: Comment[];
  visitNotes: string;
  details: HouseDetails;
  photos: PhotoMeta[];
  createdAt: string;
  updatedAt: string;
}

export type HousePayload = Omit<House, "id" | "createdAt" | "updatedAt" | "photos">;

export interface ImportResult {
  house: House;
  imported: number;
  skipped: number;
}

export const MAX_SCORE = 10;

export function emptyDetails(): HouseDetails {
  return {
    sizeSqm: null,
    rooms: null,
    floor: null,
    condoFees: null,
    yearBuilt: null,
    energyClass: "",
  };
}

export function emptyPayload(): HousePayload {
  return {
    url: "",
    title: "",
    address: "",
    price: null,
    score: null,
    status: "new",
    tags: [],
    comments: [],
    visitNotes: "",
    details: emptyDetails(),
  };
}

export function payloadFromHouse(house: House): HousePayload {
  return {
    url: house.url,
    title: house.title,
    address: house.address,
    price: house.price,
    score: house.score,
    status: house.status,
    tags: house.tags,
    comments: house.comments,
    visitNotes: house.visitNotes,
    details: house.details,
  };
}
