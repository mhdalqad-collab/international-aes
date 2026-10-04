import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { defaultContent, freshDefaultContent, type SiteContent } from "../content/defaults";
import { getDatabase } from "./database";

type ContentRow = RowDataPacket & { content_json: string; revision: number; updated_at: string };
export type ContentRecord = { content: SiteContent; revision: number; updatedAt: string };

let schemaReady: Promise<void> | undefined;

async function ensureContentSchema() {
  const db = getDatabase();
  schemaReady ??= db.execute(`CREATE TABLE IF NOT EXISTS site_content (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    content_json LONGTEXT NOT NULL,
    revision INT UNSIGNED NOT NULL DEFAULT 1,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`).then(() => undefined).catch(error => {
    schemaReady = undefined;
    throw error;
  });
  await schemaReady;
  await db.execute(
    "INSERT IGNORE INTO site_content (id, content_json) VALUES (1, ?)",
    [JSON.stringify(defaultContent)],
  );
  return db;
}

export async function readContentRecord(): Promise<ContentRecord> {
  const db = await ensureContentSchema();
  const [rows] = await db.execute<ContentRow[]>(
    "SELECT content_json, revision, updated_at FROM site_content WHERE id = 1",
  );
  const row = rows[0];
  if (!row) throw new Error("Site content row was not created");
  const content: unknown = JSON.parse(row.content_json);
  if (!isSiteContent(content)) throw new Error("Stored site content has an invalid shape");
  return { content, revision: row.revision, updatedAt: row.updated_at };
}

export async function getSiteContent(): Promise<SiteContent> {
  if (!process.env.DATABASE_URL && !(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)) {
    return freshDefaultContent();
  }
  try {
    return (await readContentRecord()).content;
  } catch (error) {
    console.error("Unable to load editable site content:", error);
    return freshDefaultContent();
  }
}

export async function updateSiteContent(content: SiteContent, expectedRevision: number): Promise<ContentRecord | null> {
  const db = await ensureContentSchema();
  const [result] = await db.execute<ResultSetHeader>(
    "UPDATE site_content SET content_json = ?, revision = revision + 1 WHERE id = 1 AND revision = ?",
    [JSON.stringify(content), expectedRevision],
  );
  return result.affectedRows === 1 ? readContentRecord() : null;
}

function matchesCopyShape(value: unknown, template: unknown): boolean {
  if (typeof template === "string") return typeof value === "string" && value.length <= 5000;
  if (Array.isArray(template)) {
    return Array.isArray(value) && value.length === template.length && value.every((item, i) => matchesCopyShape(item, template[i]));
  }
  if (template && typeof template === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const expected = Object.keys(template);
    const actual = Object.keys(value);
    return expected.length === actual.length && expected.every(key => key in value && matchesCopyShape((value as Record<string, unknown>)[key], (template as Record<string, unknown>)[key]));
  }
  return false;
}

function textTuple(value: unknown): value is [string, string, string] {
  return Array.isArray(value) && value.length === 3 && value.every(item => typeof item === "string" && item.trim().length > 0 && item.length <= 5000);
}

function localImage(value: unknown): value is string {
  return typeof value === "string" && (value === "" || (value.length <= 300 && value.startsWith("/") && !value.startsWith("//") && !value.includes("..") && !value.includes("\\") && !/[?#]/.test(value)));
}

export function isSiteContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const site = value as Record<string, unknown>;
  if (!Array.isArray(site.services) || site.services.length > 60 || !Array.isArray(site.projects) || site.projects.length > 120) return false;
  if (!matchesCopyShape(site.copy, defaultContent.copy)) return false;
  if (!matchesCopyShape(site.contact, defaultContent.contact)) return false;
  const copy = site.copy as SiteContent["copy"];
  if (copy.ar.dir !== "rtl" || copy.en.dir !== "ltr") return false;
  const contact = site.contact as SiteContent["contact"];
  if (!/^\+?[\d ()-]{5,35}$/.test(contact.syriaPhone) || !/^\+?[\d ()-]{5,35}$/.test(contact.omanPhone) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) || !/^https:\/\//.test(contact.linkedin)) return false;
  if (!site.services.every(item => {
    if (!item || typeof item !== "object") return false;
    const service = item as Record<string, unknown>;
    return typeof service.icon === "string" && service.icon.length <= 16 && textTuple(service.ar) && textTuple(service.en);
  })) return false;
  const codes = new Set<string>();
  return site.projects.every(item => {
    if (!item || typeof item !== "object") return false;
    const project = item as Record<string, unknown>;
    if (typeof project.code !== "string" || !/^[A-Za-z0-9-]{2,16}$/.test(project.code)) return false;
    if (codes.has(project.code.toLowerCase())) return false;
    codes.add(project.code.toLowerCase());
    return localImage(project.img) &&
      (project.video === undefined || project.video === "" || (typeof project.video === "string" && project.video.length <= 500 && /^https:\/\//.test(project.video))) &&
      textTuple(project.ar) && textTuple(project.en);
  });
}
