import { isAdminAuthorized, sameOrigin, unauthorizedAdmin } from "../../../lib/admin-auth";
import { isSiteContent, readContentRecord, updateSiteContent } from "../../../lib/site-content";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorizedAdmin();
  try {
    return Response.json(await readContentRecord(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin content read failed:", error);
    return Response.json({ error: "Content database is unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorizedAdmin();
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 1024 * 1024) return Response.json({ error: "Content is too large" }, { status: 413 });
  const payload = await request.json().catch(() => null);
  if (!payload || !isSiteContent(payload.content) || !Number.isSafeInteger(payload.revision) || payload.revision < 1) {
    return Response.json({ error: "Invalid content" }, { status: 400 });
  }
  try {
    const saved = await updateSiteContent(payload.content, payload.revision);
    return saved
      ? Response.json(saved, { headers: { "Cache-Control": "no-store" } })
      : Response.json({ error: "Content changed in another session. Reload before saving." }, { status: 409 });
  } catch (error) {
    console.error("Admin content save failed:", error);
    return Response.json({ error: "Could not save content" }, { status: 503 });
  }
}
