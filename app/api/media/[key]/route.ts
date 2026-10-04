import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const mime: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(key)) return new Response(null, { status: 404 });
  const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  try {
    const image = await readFile(path.join(process.cwd(), "public", "assets", "site-images", key));
    return new Response(new Uint8Array(image), {
      headers: {
        "Content-Type": mime[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return new Response(null, { status: 404 });
    console.error("Stored site image read failed:", error);
    return new Response(null, { status: 503 });
  }
}
