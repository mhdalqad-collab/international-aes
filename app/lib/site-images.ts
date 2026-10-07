import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";

export const MAX_SITE_IMAGE_BYTES = 8 * 1024 * 1024;
// Keep each SQL packet small enough for managed MySQL configurations.
const CHUNK_BYTES = 512 * 1024;
const schemaReady = new WeakMap<Pool, Promise<void>>();

export function validSiteImageKey(key: string) {
  return /^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(key);
}

export function siteImageType(bytes: Buffer) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { extension: "png", contentType: "image/png" };
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return { extension: "jpg", contentType: "image/jpeg" };
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return { extension: "webp", contentType: "image/webp" };
  return null;
}

async function ensureImageSchema(db: Pool) {
  let ready = schemaReady.get(db);
  if (!ready) {
    ready = (async () => {
      await db.execute(`CREATE TABLE IF NOT EXISTS site_images (
        image_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
        content_type VARCHAR(32) NOT NULL,
        byte_length INT UNSIGNED NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ENGINE=InnoDB`);
      await db.execute(`CREATE TABLE IF NOT EXISTS site_image_chunks (
        image_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        chunk_index SMALLINT UNSIGNED NOT NULL,
        image_data MEDIUMBLOB NOT NULL,
        PRIMARY KEY (image_key, chunk_index),
        CONSTRAINT site_image_chunks_image_fk FOREIGN KEY (image_key) REFERENCES site_images(image_key) ON DELETE CASCADE
      ) ENGINE=InnoDB`);
    })().catch(error => {
      schemaReady.delete(db);
      throw error;
    });
    schemaReady.set(db, ready);
  }
  await ready;
}

export async function saveSiteImage(db: Pool, key: string, bytes: Buffer) {
  const type = siteImageType(bytes);
  if (!validSiteImageKey(key) || !type || !bytes.length || bytes.length > MAX_SITE_IMAGE_BYTES ||
      !key.toLowerCase().endsWith(`.${type.extension}`)) {
    throw new Error("Invalid project image");
  }
  await ensureImageSchema(db);
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    // Existing UUID URLs are immutable; concurrent legacy imports must not overwrite them.
    const [inserted] = await connection.execute<ResultSetHeader>(
      "INSERT IGNORE INTO site_images (image_key, content_type, byte_length) VALUES (?, ?, ?)",
      [key, type.contentType, bytes.length],
    );
    if (inserted.affectedRows) {
      for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
        await connection.execute(
          "INSERT INTO site_image_chunks (image_key, chunk_index, image_data) VALUES (?, ?, ?)",
          [key, offset / CHUNK_BYTES, bytes.subarray(offset, offset + CHUNK_BYTES)],
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

type ImageRow = RowDataPacket & {
  content_type: string;
  byte_length: number;
  chunk_index: number | null;
  image_data: Buffer | null;
};

export async function readSiteImage(
  db: Pool,
  key: string,
  legacyDirectory = path.join(process.cwd(), "public", "assets", "site-images"),
): Promise<{ bytes: Buffer; contentType: string } | null> {
  if (!validSiteImageKey(key)) return null;
  await ensureImageSchema(db);
  const [rows] = await db.execute<ImageRow[]>(
    `SELECT i.content_type, i.byte_length, c.chunk_index, c.image_data
     FROM site_images i LEFT JOIN site_image_chunks c ON c.image_key = i.image_key
     WHERE i.image_key = ? ORDER BY c.chunk_index`,
    [key],
  );
  if (rows.length) {
    const length = rows[0].byte_length;
    if (length < 1 || length > MAX_SITE_IMAGE_BYTES ||
        rows.length !== Math.ceil(length / CHUNK_BYTES) ||
        rows.some((row, index) => row.chunk_index !== index || !Buffer.isBuffer(row.image_data))) {
      throw new Error("Stored project image is incomplete");
    }
    const bytes = Buffer.concat(rows.map(row => row.image_data!));
    if (bytes.length !== length) throw new Error("Stored project image size does not match");
    return { bytes, contentType: rows[0].content_type };
  }

  // Preserve URLs uploaded by earlier versions when their local files still exist.
  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(legacyDirectory, key));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
  await saveSiteImage(db, key, bytes);
  return { bytes, contentType: siteImageType(bytes)!.contentType };
}
