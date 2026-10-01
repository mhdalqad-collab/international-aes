import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "./database";

let schemaReady: Promise<void> | undefined;

export function ensureArchiveSchema() {
  const db = getDatabase();
  schemaReady ??= (async () => {
    await db.execute(`CREATE TABLE IF NOT EXISTS customers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      organization VARCHAR(160) NOT NULL,
      phone VARCHAR(80) NOT NULL,
      email VARCHAR(254) NOT NULL DEFAULT '',
      area VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX customers_name_idx (name),
      INDEX customers_phone_idx (phone),
      INDEX customers_area_idx (area)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await db.execute(`CREATE TABLE IF NOT EXISTS customer_files (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id BIGINT UNSIGNED NOT NULL,
      object_key VARCHAR(512) NOT NULL UNIQUE,
      file_name VARCHAR(255) NOT NULL,
      content_type VARCHAR(160) NOT NULL,
      size BIGINT UNSIGNED NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX customer_files_customer_idx (customer_id),
      CONSTRAINT customer_files_customer_fk FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  })();
  return schemaReady.then(() => db);
}

function requiredSecret(name: "ARCHIVE_SESSION_SECRET" | "FILE_ENCRYPTION_SECRET") {
  const value =
    process.env[name] ||
    (name === "FILE_ENCRYPTION_SECRET"
      ? process.env.ARCHIVE_SESSION_SECRET
      : undefined);
  if (!value || value.length < 32) {
    throw new Error(`${name} must contain at least 32 characters`);
  }
  return value;
}

function signature(value: string) {
  return createHmac("sha256", requiredSecret("ARCHIVE_SESSION_SECRET"))
    .update(value)
    .digest("hex");
}

export function createArchiveToken() {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expires}.${signature(expires)}`;
}

export function isArchiveAuthorized(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("aes_archive="))
    ?.slice("aes_archive=".length);
  if (!token) return false;
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || Number(expires) < Date.now()) return false;
  const expected = signature(expires);
  return (
    supplied.length === expected.length &&
    timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  );
}

export function passwordMatches(candidate: string) {
  const expected = process.env.ARCHIVE_PASSWORD;
  if (!expected) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function unauthorized() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "cache-control": "no-store" } },
  );
}

const storageRoot = path.join(
  process.cwd(),
  "public",
  "assets",
  "customer-documents",
);

function encryptionKey() {
  return createHash("sha256")
    .update(requiredSecret("FILE_ENCRYPTION_SECRET"))
    .digest();
}

export async function saveEncryptedFile(data: Buffer) {
  await mkdir(storageRoot, { recursive: true });
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const stored = Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  const objectKey = `${crypto.randomUUID()}.aes`;
  await writeFile(path.join(storageRoot, objectKey), stored, { flag: "wx" });
  return objectKey;
}

export async function readEncryptedFile(objectKey: string) {
  if (!/^[0-9a-f-]{36}\.aes$/i.test(objectKey)) {
    throw new Error("Invalid stored file key");
  }
  const stored = await readFile(path.join(storageRoot, objectKey));
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    stored.subarray(0, 12),
  );
  decipher.setAuthTag(stored.subarray(12, 28));
  return Buffer.concat([
    decipher.update(stored.subarray(28)),
    decipher.final(),
  ]);
}
