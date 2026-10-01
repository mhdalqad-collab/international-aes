import { createArchiveToken, passwordMatches } from "../../../lib/archive";

export const runtime = "nodejs";

export async function POST(request:Request){
  const {password}=await request.json() as {password?:string};
  if(!passwordMatches(password||""))return Response.json({error:"Invalid password"},{status:401});
  const token=await createArchiveToken();
  const secure=process.env.NODE_ENV==="production"?" Secure;":"";
  return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json","cache-control":"no-store","set-cookie":`aes_archive=${token}; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=28800`}});
}
