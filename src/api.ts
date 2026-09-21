import type { House, HousePayload } from "../shared/types";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(path, { credentials: "same-origin", ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string") message = data.error;
    } catch {
      // keep the default message when the body is not JSON
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  session: () => request<{ authenticated: boolean }>("/api/session"),
  login: (password: string) =>
    request<{ authenticated: boolean }>("/api/session", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  logout: () => request<{ authenticated: boolean }>("/api/session", { method: "DELETE" }),
  listHouses: () => request<House[]>("/api/houses"),
  createHouse: (payload: HousePayload) =>
    request<House>("/api/houses", { method: "POST", body: JSON.stringify(payload) }),
  updateHouse: (house: House) =>
    request<House>("/api/houses", { method: "PUT", body: JSON.stringify(house) }),
  deleteHouse: (id: string) =>
    request<{ deleted: boolean }>(`/api/houses?id=${encodeURIComponent(id)}`, { method: "DELETE" }),
  uploadPhoto: (houseId: string, file: File) => {
    const form = new FormData();
    form.append("houseId", houseId);
    form.append("file", file);
    return request<House>("/api/photos", { method: "POST", body: form });
  },
  deletePhoto: (houseId: string, photoId: string) =>
    request<House>(
      `/api/photos?houseId=${encodeURIComponent(houseId)}&photoId=${encodeURIComponent(photoId)}`,
      { method: "DELETE" },
    ),
};

export const photoUrl = (houseId: string, photoId: string) =>
  `/api/photos?houseId=${encodeURIComponent(houseId)}&photoId=${encodeURIComponent(photoId)}`;
