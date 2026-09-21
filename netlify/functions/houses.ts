import { requireAuth } from "../lib/auth";
import { createHouse, deleteHouse, listHouses, updateHouse } from "../lib/houses-repo";
import { apiError, json, readJsonBody } from "../lib/http";
import { ValidationError } from "../lib/validate";

export default async function handler(req: Request): Promise<Response> {
  const authError = requireAuth(req);
  if (authError) return authError;

  const url = new URL(req.url);

  try {
    switch (req.method) {
      case "GET":
        return json(await listHouses());

      case "POST": {
        const body = await readJsonBody(req);
        if (!body) return apiError(400, "Invalid JSON body");
        return json(await createHouse(body), 201);
      }

      case "PUT": {
        const body = await readJsonBody(req);
        if (!body) return apiError(400, "Invalid JSON body");
        const id = typeof body.id === "string" && body.id ? body.id : url.searchParams.get("id");
        if (!id) return apiError(400, "Missing house id");
        const house = await updateHouse(id, body);
        return house ? json(house) : apiError(404, "House not found");
      }

      case "DELETE": {
        const id = url.searchParams.get("id");
        if (!id) return apiError(400, "Missing house id");
        return (await deleteHouse(id)) ? json({ deleted: true }) : apiError(404, "House not found");
      }

      default:
        return apiError(405, "Method not allowed");
    }
  } catch (error) {
    if (error instanceof ValidationError) return apiError(400, error.message);
    throw error;
  }
}
