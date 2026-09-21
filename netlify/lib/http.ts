export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function apiError(status: number, message: string, code?: string): Response {
  return json(code ? { error: message, code } : { error: message }, status);
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const data: unknown = await req.json();
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}
