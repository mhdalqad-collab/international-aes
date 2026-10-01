import { ensureArchiveSchema, isArchiveAuthorized, unauthorized } from "../../../lib/archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request:Request){
  if(!await isArchiveAuthorized(request))return unauthorized();
  const db=await ensureArchiveSchema();
  const [rows]=await db.query("SELECT * FROM customers ORDER BY created_at DESC");
  return Response.json({customers:rows},{headers:{"cache-control":"no-store"}});
}
