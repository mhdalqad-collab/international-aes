import { clearAdminCookie, sameOrigin } from "../../../lib/admin-auth";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearAdminCookie(request), "Cache-Control": "no-store" } });
}
