import { ensureArchiveSchema } from "../../lib/archive";
import { inquiryEmailConfigured, sendInquiryEmail } from "../../lib/inquiry-email";

export const runtime = "nodejs";

const attempts = new Map<string, { count: number; until: number }>();

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 12_000) {
    return Response.json({ error: "Request is too large" }, { status: 413 });
  }
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const values = body as Record<string, unknown>;
  const clean = (key: string, limit: number) => typeof values[key] === "string" ? values[key].trim().slice(0, limit) : "";
  const inquiry = {
    name: clean("name", 120),
    organization: clean("organization", 160),
    phone: clean("phone", 80),
    email: clean("email", 254),
    area: clean("area", 160),
    message: clean("message", 4000),
  };
  if (Object.values(inquiry).some(value => !value)) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) {
    const now = Date.now();
    if (attempts.size > 1000) for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const previous = attempts.get(ip);
    if (previous && previous.until > now && previous.count >= 10) {
      return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    attempts.set(ip, { count: previous && previous.until > now ? previous.count + 1 : 1, until: now + 15 * 60_000 });
  }

  try {
    const db = await ensureArchiveSchema();
    await db.execute(
      "INSERT INTO customers (name, organization, phone, email, area, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [inquiry.name, inquiry.organization, inquiry.phone, inquiry.email, inquiry.area, inquiry.message, new Date()],
    );
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    console.error("Unable to save inquiry:", code);
    return Response.json({ error: "Unable to save inquiry" }, { status: 500 });
  }

  if (!inquiryEmailConfigured()) {
    console.warn("Inquiry saved, but email notification is not configured");
    return Response.json({ ok: true, notificationSent: false });
  }
  try {
    await sendInquiryEmail(inquiry);
    return Response.json({ ok: true, notificationSent: true });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
    console.error("Inquiry saved, but email notification failed:", code);
    return Response.json({ ok: true, notificationSent: false });
  }
}
