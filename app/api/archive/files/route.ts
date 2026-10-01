import type { RowDataPacket } from "mysql2";
import { ensureArchiveSchema, isArchiveAuthorized, saveEncryptedFile, unauthorized } from "../../../lib/archive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request:Request){
  if(!await isArchiveAuthorized(request))return unauthorized();
  const id=new URL(request.url).searchParams.get("customerId");if(!id)return Response.json({error:"Missing customer"},{status:400});
  const db=await ensureArchiveSchema();const [rows]=await db.execute<RowDataPacket[]>("SELECT id, customer_id, file_name, content_type, size, created_at FROM customer_files WHERE customer_id=? ORDER BY created_at DESC",[id]);return Response.json({files:rows},{headers:{"cache-control":"no-store"}});
}
export async function POST(request:Request){
  if(!await isArchiveAuthorized(request))return unauthorized();
  const form=await request.formData();const customerId=String(form.get("customerId")||"");const file=form.get("file");
  if(!customerId||!(file instanceof File)||file.size>20*1024*1024)return Response.json({error:"Invalid file"},{status:400});
  const db=await ensureArchiveSchema();const [customers]=await db.execute<RowDataPacket[]>("SELECT id FROM customers WHERE id=?",[customerId]);if(!customers.length)return Response.json({error:"Customer not found"},{status:404});
  const key=await saveEncryptedFile(Buffer.from(await file.arrayBuffer()));
  const fileName=file.name.replace(/[\r\n]/g,"").slice(0,255)||"document";
  const contentType=(file.type||"application/octet-stream").slice(0,160);
  await db.execute("INSERT INTO customer_files (customer_id, object_key, file_name, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?)",[customerId,key,fileName,contentType,file.size,new Date()]);
  return Response.json({ok:true});
}
