import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "aes_admin";
const sessionLength = 8 * 60 * 60 * 1000;

function sessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters");
  return value;
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

export function adminPasswordMatches(candidate: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 12 || candidate.length > 1024) return false;
  const left = createHash("sha256").update(candidate).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function adminCookie(request: Request) {
  const expires = String(Date.now() + sessionLength);
  const secure = new URL(request.url).protocol === "https:" ? " Secure;" : "";
  return `${cookieName}=${expires}.${sign(expires)}; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=${sessionLength / 1000}`;
}

export function clearAdminCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? " Secure;" : "";
  return `${cookieName}=; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=0`;
}

export function isAdminAuthorized(request: Request) {
  const raw = request.headers.get("cookie") || "";
  const token = raw.split(";").map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !/^\d{13}$/.test(expires) || !signature || Number(expires) <= Date.now()) return false;
  const expected = sign(expires);
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}

export function unauthorizedAdmin() {
  return Response.json({ error: "Sign in required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
