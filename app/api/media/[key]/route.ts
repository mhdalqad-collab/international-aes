import { getDatabase } from "../../../lib/database";
import { readSiteImage, validSiteImageKey } from "../../../lib/site-images";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!validSiteImageKey(key)) return new Response(null, { status: 404, headers: noStore });
  try {
    const image = await readSiteImage(getDatabase(), key);
    if (!image) return new Response(null, { status: 404, headers: noStore });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Stored site image read failed:", error);
    return new Response(null, { status: 503, headers: noStore });
  }
}
