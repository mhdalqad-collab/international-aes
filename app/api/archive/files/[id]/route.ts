import type { RowDataPacket } from "mysql2";
import { ensureArchiveSchema, isArchiveAuthorized, readEncryptedFile, unauthorized } from "../../../../lib/archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!await isArchiveAuthorized(request))return unauthorized();const {id}=await params;const db=await ensureArchiveSchema();const [rows]=await db.execute<RowDataPacket[]>("SELECT * FROM customer_files WHERE id=?",[id]);const row=rows[0];if(!row)return new Response("Not found",{status:404});
  try{const file=await readEncryptedFile(String(row.object_key));return new Response(file,{headers:{"content-type":String(row.content_type),"content-disposition":`attachment; filename*=UTF-8''${encodeURIComponent(String(row.file_name))}`,"cache-control":"private, no-store"}})}catch{return new Response("Not found",{status:404})}
}
