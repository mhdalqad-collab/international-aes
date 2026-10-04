import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAdminAuthorized, sameOrigin, unauthorizedAdmin } from "../../../lib/admin-auth";

export const runtime = "nodejs";

function imageType(bytes: Buffer) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: "png" };
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { extension: "jpg" };
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return { extension: "webp" };
  return null;
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) return unauthorizedAdmin();
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 9 * 1024 * 1024) return Response.json({ error: "Image is too large" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File) || file.size < 1 || file.size > 8 * 1024 * 1024) {
    return Response.json({ error: "Choose an image under 8 MB" }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type) return Response.json({ error: "Use a PNG, JPEG or WebP image" }, { status: 400 });
  try {
    const key = `${randomUUID()}.${type.extension}`;
    const dir = path.join(process.cwd(), "public", "assets", "site-images");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, key), bytes, { flag: "wx" });
    return Response.json({ url: `/api/media/${key}` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Image upload failed:", error);
    return Response.json({ error: "Image could not be stored" }, { status: 503 });
  }
}
