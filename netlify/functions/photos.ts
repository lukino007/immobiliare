import { requireAuth } from "../lib/auth";
import { MAX_PHOTO_BYTES, addPhoto, getPhotoBinary, removePhoto } from "../lib/houses-repo";
import { apiError, json } from "../lib/http";

export default async function handler(req: Request): Promise<Response> {
  const authError = requireAuth(req);
  if (authError) return authError;

  const url = new URL(req.url);

  if (req.method === "GET") {
    const houseId = url.searchParams.get("houseId");
    const photoId = url.searchParams.get("photoId");
    if (!houseId || !photoId) return apiError(400, "Missing houseId or photoId");
    const photo = await getPhotoBinary(houseId, photoId);
    if (!photo) return apiError(404, "Photo not found");
    return new Response(photo.data, {
      headers: {
        "content-type": photo.contentType,
        "cache-control": "private, max-age=86400",
      },
    });
  }

  if (req.method === "POST") {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return apiError(400, "Invalid form data");
    }
    const houseId = form.get("houseId");
    const file = form.get("file");
    if (typeof houseId !== "string" || !houseId) return apiError(400, "Missing houseId");
    if (!(file instanceof File)) return apiError(400, "Missing file");
    if (!file.type.startsWith("image/")) return apiError(400, "Only image files are allowed");
    if (file.size > MAX_PHOTO_BYTES) {
      return apiError(413, `File too large (max ${Math.floor(MAX_PHOTO_BYTES / (1024 * 1024))} MB)`);
    }
    const house = await addPhoto(houseId, file);
    return house ? json(house) : apiError(404, "House not found");
  }

  if (req.method === "DELETE") {
    const houseId = url.searchParams.get("houseId");
    const photoId = url.searchParams.get("photoId");
    if (!houseId || !photoId) return apiError(400, "Missing houseId or photoId");
    const house = await removePhoto(houseId, photoId);
    return house ? json(house) : apiError(404, "House not found");
  }

  return apiError(405, "Method not allowed");
}
