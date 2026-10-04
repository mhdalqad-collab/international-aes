import { adminCookie, adminPasswordMatches, sameOrigin } from "../../../lib/admin-auth";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; until: number }>();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const key = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (attempts.size > 1000) for (const [ip, entry] of attempts) if (entry.until <= now) attempts.delete(ip);
  const prior = attempts.get(key);
  if (prior && prior.until > now && prior.count >= 8) {
    return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== "string" || !adminPasswordMatches(body.password)) {
    attempts.set(key, { count: prior && prior.until > now ? prior.count + 1 : 1, until: now + 15 * 60 * 1000 });
    return Response.json({ error: "Incorrect password" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  attempts.delete(key);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": adminCookie(request), "Cache-Control": "no-store" } });
}
