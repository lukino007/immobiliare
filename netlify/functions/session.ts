import {
  checkPassword,
  clearSessionCookie,
  createSessionToken,
  isAuthenticated,
  sessionCookie,
} from "../lib/auth";
import { apiError, json, readJsonBody } from "../lib/http";

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "GET") {
    return json({ authenticated: isAuthenticated(req) });
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    if (!body || !checkPassword(body.password)) {
      return apiError(401, "Invalid password");
    }
    return json({ authenticated: true }, 200, {
      "set-cookie": sessionCookie(req, createSessionToken()),
    });
  }

  if (req.method === "DELETE") {
    return json({ authenticated: false }, 200, {
      "set-cookie": clearSessionCookie(req),
    });
  }

  return apiError(405, "Method not allowed");
}
