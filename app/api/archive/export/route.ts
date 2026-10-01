import { ensureArchiveSchema, isArchiveAuthorized, unauthorized } from "../../../lib/archive";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc=(v:unknown)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
export async function GET(request:Request){
  if(!await isArchiveAuthorized(request))return unauthorized();
  const db=await ensureArchiveSchema();const [rows]=await db.query<RowDataPacket[]>("SELECT * FROM customers ORDER BY created_at DESC");
  const table=`<html><head><meta charset="utf-8"></head><body><table border="1"><tr><th>ID</th><th>Name</th><th>Organization</th><th>Phone</th><th>Email</th><th>Area</th><th>Message</th><th>Date</th></tr>${rows.map(r=>`<tr><td>${r.id}</td><td>${esc(r.name)}</td><td>${esc(r.organization)}</td><td>${esc(r.phone)}</td><td>${esc(r.email)}</td><td>${esc(r.area)}</td><td>${esc(r.message)}</td><td>${esc(r.created_at)}</td></tr>`).join("")}</table></body></html>`;
  return new Response(table,{headers:{"content-type":"application/vnd.ms-excel; charset=utf-8","content-disposition":"attachment; filename=client-archive.xls","cache-control":"no-store"}});
}
