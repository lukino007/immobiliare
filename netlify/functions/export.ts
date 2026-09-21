import { requireAuth } from "../lib/auth";
import { listHouses } from "../lib/houses-repo";
import { apiError } from "../lib/http";

export default async function handler(req: Request): Promise<Response> {
  const authError = requireAuth(req);
  if (authError) return authError;
  if (req.method !== "GET") return apiError(405, "Method not allowed");

  const houses = await listHouses();
  const date = new Date().toISOString().slice(0, 10);
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), count: houses.length, houses }, null, 2);

  return new Response(payload, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="immobiliare-export-${date}.json"`,
      "cache-control": "no-store",
    },
  });
}
