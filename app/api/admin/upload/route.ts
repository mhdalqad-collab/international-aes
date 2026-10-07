import { randomUUID } from "node:crypto";
import { isAdminAuthorized, sameOrigin, unauthorizedAdmin } from "../../../lib/admin-auth";
import { getDatabase } from "../../../lib/database";
import { MAX_SITE_IMAGE_BYTES, saveSiteImage, siteImageType } from "../../../lib/site-images";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorizedAdmin();
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 9 * 1024 * 1024) return Response.json({ error: "Image is too large" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_SITE_IMAGE_BYTES) {
    return Response.json({ error: "Choose an image under 8 MB" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = siteImageType(bytes);
  if (!type) return Response.json({ error: "Use a PNG, JPEG or WebP image" }, { status: 400 });
  try {
    const key = `${randomUUID()}.${type.extension}`;
    await saveSiteImage(getDatabase(), key, bytes);
    return Response.json({ url: `/api/media/${key}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Image upload failed:", error);
    return Response.json({ error: "Image could not be stored" }, { status: 503 });
  }
}
