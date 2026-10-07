import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";
import * as images from "../app/lib/site-images.ts";

// A shared database double survives replacement of an application instance.
// SQL/server behavior still needs a deployment smoke test against managed MySQL.
function database(state = new Map(), failChunk = -1) {
  let transaction;
  let released = false;
  const db = {
    async execute(sql, values = []) {
      if (sql.startsWith("CREATE TABLE")) return [[], []];
      if (sql.includes("SELECT i.content_type")) {
        const entry = state.get(values[0]);
        return [entry ? entry.chunks.map((image_data, chunk_index) => ({
          content_type: entry.contentType, byte_length: entry.length, image_data, chunk_index,
        })) : [], []];
      }
      throw new Error("Unexpected query");
    },
    async getConnection() {
      return {
        async beginTransaction() { transaction = new Map(); },
        async execute(sql, values) {
          const [key, second, third] = values;
          if (sql.startsWith("INSERT IGNORE INTO site_images")) {
            if (state.has(key)) return [{ affectedRows: 0 }, []];
            transaction.set(key, { contentType: second, length: third, chunks: [] });
            return [{ affectedRows: 1 }, []];
          }
          if (sql.startsWith("INSERT INTO site_image_chunks")) {
            if (second === failChunk) throw new Error("Simulated interrupted database write");
            assert.ok(third.length <= 512 * 1024, "SQL packets must remain small");
            transaction.get(key).chunks[second] = Buffer.from(third);
            return [{ affectedRows: 1 }, []];
          }
          throw new Error("Unexpected write");
        },
        async commit() {
          for (const [key, entry] of transaction) state.set(key, entry);
          transaction = undefined;
        },
        async rollback() { transaction = undefined; },
        release() { released = true; },
      };
    },
    get released() { return released; },
  };
  return db;
}

function png(size = 32) {
  const bytes = Buffer.alloc(size, 42);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  return bytes;
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "aes-site-image-test-"));
  t.after(async () => {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith("aes-site-image-test-"));
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test("8 MB image survives an application replacement with an empty filesystem", async t => {
  const state = new Map();
  const key = `${randomUUID()}.png`;
  const bytes = png(images.MAX_SITE_IMAGE_BYTES);
  const firstApp = database(state);
  await images.saveSiteImage(firstApp, key, bytes);
  assert.equal(firstApp.released, true);
  assert.equal(state.get(key).chunks.length, 16);

  const freshModule = await import(`../app/lib/site-images.ts?restart=${randomUUID()}`);
  const emptyDirectory = await temporaryDirectory(t);
  const result = await freshModule.readSiteImage(database(state), key, emptyDirectory);
  assert.equal(result.contentType, "image/png");
  assert.deepEqual(result.bytes, bytes);
});

test("legacy image is imported and survives removal of the original file", async t => {
  const directory = await temporaryDirectory(t);
  const state = new Map();
  const db = database(state);
  const key = `${randomUUID()}.png`;
  const bytes = png();
  await writeFile(path.join(directory, key), bytes);
  assert.deepEqual((await images.readSiteImage(db, key, directory)).bytes, bytes);
  await rm(path.join(directory, key));
  assert.deepEqual((await images.readSiteImage(database(state), key, directory)).bytes, bytes);
});

test("interrupted writes roll back instead of leaving a partially saved image", async t => {
  const state = new Map();
  const db = database(state, 1);
  const key = `${randomUUID()}.png`;
  await assert.rejects(images.saveSiteImage(db, key, png(1024 * 1024)), /interrupted database write/);
  assert.equal(db.released, true);
  assert.equal(state.size, 0);
  assert.equal(await images.readSiteImage(database(state), key, await temporaryDirectory(t)), null);
});

test("existing image URLs cannot be overwritten by a repeated import", async t => {
  const state = new Map();
  const db = database(state);
  const key = `${randomUUID()}.png`;
  const original = png();
  await images.saveSiteImage(db, key, original);
  await images.saveSiteImage(db, key, png(64));
  assert.deepEqual((await images.readSiteImage(db, key, await temporaryDirectory(t))).bytes, original);
});

test("invalid paths and oversized uploads are rejected without database writes", async () => {
  const state = new Map();
  const db = database(state);
  assert.equal(await images.readSiteImage(db, "../../secret.png"), null);
  await assert.rejects(images.saveSiteImage(db, `${randomUUID()}.png`, png(images.MAX_SITE_IMAGE_BYTES + 1)), /Invalid project image/);
  await assert.rejects(images.saveSiteImage(db, `${randomUUID()}.jpg`, png()), /Invalid project image/);
  assert.equal(state.size, 0);
});

test("schema creation can recover after a temporary database outage", async () => {
  const state = new Map();
  const db = database(state);
  const execute = db.execute;
  db.execute = async () => { throw new Error("Database unavailable"); };
  const key = `${randomUUID()}.png`;
  await assert.rejects(images.saveSiteImage(db, key, png()), /Database unavailable/);
  db.execute = execute;
  await images.saveSiteImage(db, key, png());
  assert.equal(state.size, 1);
});

// Compile the actual route without starting Next.js, injecting database/auth boundaries.
async function route(relativePath, db) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const dependencies = {
    "node:crypto": { randomUUID },
    "../../../lib/admin-auth": { isAdminAuthorized: () => true, sameOrigin: () => true },
    "../../../lib/database": { getDatabase: () => db },
    "../../../lib/site-images": images,
  };
  new Function("require", "exports", compiled)(name => {
    assert.ok(name in dependencies, `Unexpected import: ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
}

test("upload endpoint and media endpoint share durable bytes across instances", async () => {
  const state = new Map();
  const upload = await route("../app/api/admin/upload/route.ts", database(state));
  const form = new FormData();
  const bytes = png();
  form.set("image", new File([bytes], "project.png", { type: "image/png" }));
  const response = await upload.POST(new Request("https://example.com/api/admin/upload", { method: "POST", body: form }));
  assert.equal(response.status, 200);
  const { url } = await response.json();
  const media = await route("../app/api/media/[key]/route.ts", database(state));
  const result = await media.GET(new Request(`https://example.com${url}`), {
    params: Promise.resolve({ key: url.split("/").at(-1) }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Content-Type"), "image/png");
  assert.deepEqual(Buffer.from(await result.arrayBuffer()), bytes);
});

test("missing-image responses are not cached", async () => {
  const media = await route("../app/api/media/[key]/route.ts", database());
  const result = await media.GET(new Request("https://example.com"), {
    params: Promise.resolve({ key: `${randomUUID()}.png` }),
  });
  assert.equal(result.status, 404);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
});

test("upload failure never returns a successful image URL", async t => {
  t.mock.method(console, "error", () => {});
  const upload = await route("../app/api/admin/upload/route.ts", {
    execute: async () => { throw new Error("Database unavailable"); },
  });
  const form = new FormData();
  form.set("image", new File([png()], "project.png", { type: "image/png" }));
  const result = await upload.POST(new Request("https://example.com/api/admin/upload", { method: "POST", body: form }));
  assert.equal(result.status, 503);
  const body = await result.json();
  assert.equal(body.url, undefined);
  assert.equal(body.error, "Image could not be stored");
});

test("database outage is a retryable 503 rather than a cached missing image", async t => {
  t.mock.method(console, "error", () => {});
  const media = await route("../app/api/media/[key]/route.ts", {
    execute: async () => { throw new Error("Database unavailable"); },
  });
  const result = await media.GET(new Request("https://example.com"), {
    params: Promise.resolve({ key: `${randomUUID()}.png` }),
  });
  assert.equal(result.status, 503);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
});
