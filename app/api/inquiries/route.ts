import { ensureArchiveSchema } from "../../lib/archive";

export const runtime = "nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json() as Record<string,string>;
    const clean=(k:string,n:number)=>String(body[k]||"").trim().slice(0,n);
    const name=clean("name",120),organization=clean("organization",160),phone=clean("phone",80),email=clean("email",254),area=clean("area",160),message=clean("message",4000);
    if(!name||!organization||!phone||!email||!area||!message)return Response.json({error:"Missing required fields"},{status:400});
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return Response.json({error:"Invalid email address"},{status:400});
    const db=await ensureArchiveSchema();
    await db.execute("INSERT INTO customers (name, organization, phone, email, area, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",[name,organization,phone,email,area,message,new Date()]);
    return Response.json({ok:true});
  }catch{return Response.json({error:"Unable to save inquiry"},{status:500})}
}
