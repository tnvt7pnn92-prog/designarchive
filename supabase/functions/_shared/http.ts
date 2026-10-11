// Small helpers shared by every server function: CORS, JSON answers, errors with a code the site
// understands (see src/lib/backend.js → callFunction).

// Only the site itself may call the functions from a browser. SITE_ORIGIN is the origin of the
// published site (e.g. https://user.github.io); ALLOWED_ORIGINS can add more, comma separated
// (http://localhost:5173 while developing).
const allowed = new Set(
  [Deno.env.get("SITE_ORIGIN"), ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",")]
    .map((value) => value?.trim())
    .filter(Boolean) as string[],
);

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : [...allowed][0] ?? "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function preflight(request: Request): Response | null {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  return null;
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

export function fail(request: Request, status: number, code: string, message = code): Response {
  return json(request, { code, message }, status);
}
