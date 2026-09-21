import type { House, HouseStatus } from "../shared/types";

export type SortOption = "updated" | "created" | "score" | "price_asc" | "price_desc";

export interface Filters {
  search: string;
  status: HouseStatus | "all";
  tag: string;
  minPrice: string;
  maxPrice: string;
  minScore: string;
  sort: SortOption;
}

export const defaultFilters: Filters = {
  search: "",
  status: "all",
  tag: "",
  minPrice: "",
  maxPrice: "",
  minScore: "",
  sort: "updated",
};

export function isDefaultFilters(filters: Filters): boolean {
  return JSON.stringify(filters) === JSON.stringify(defaultFilters);
}

function toFilterNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function applyFilters(houses: House[], filters: Filters): House[] {
  const search = filters.search.trim().toLowerCase();
  const minPrice = toFilterNumber(filters.minPrice);
  const maxPrice = toFilterNumber(filters.maxPrice);
  const minScore = toFilterNumber(filters.minScore);

  const filtered = houses.filter((house) => {
    if (filters.status !== "all" && house.status !== filters.status) return false;
    if (filters.tag && !house.tags.includes(filters.tag)) return false;
    if (minPrice !== null && (house.price === null || house.price < minPrice)) return false;
    if (maxPrice !== null && (house.price === null || house.price > maxPrice)) return false;
    if (minScore !== null && (house.score === null || house.score < minScore)) return false;
    if (search) {
      const haystack = [
        house.title,
        house.address,
        house.url,
        house.tags.join(" "),
        house.visitNotes,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case "created":
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      break;
    case "score":
      sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      break;
    case "price_asc":
      sorted.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY));
      break;
    case "price_desc":
      sorted.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
      break;
    default:
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      break;
  }
  return sorted;
}

export function collectTags(houses: House[]): string[] {
  const tags = new Set<string>();
  for (const house of houses) {
    for (const tag of house.tags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "it"));
}
