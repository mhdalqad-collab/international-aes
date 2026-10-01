import mysql, { type Pool, type PoolOptions } from "mysql2/promise";

declare global {
  var aesMySqlPool: Pool | undefined;
}

function databaseOptions(): string | PoolOptions {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const database = process.env.DB_NAME;
  if (!host || !user || !database) {
    throw new Error(
      "MySQL is not configured. Set DATABASE_URL, or set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, and DB_NAME in GoDaddy Secrets.",
    );
  }

  return {
    host,
    port: Number.parseInt(process.env.DB_PORT || "3306", 10),
    user,
    password: process.env.DB_PASSWORD || "",
    database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: "utf8mb4",
    dateStrings: true,
    ...(process.env.DB_SSL === "true" ? { ssl: {} } : {}),
  };
}

export function getDatabase(): Pool {
  if (!globalThis.aesMySqlPool) {
    const options = databaseOptions();
    globalThis.aesMySqlPool =
      typeof options === "string"
        ? mysql.createPool(options)
        : mysql.createPool(options);
  }
  return globalThis.aesMySqlPool;
}
