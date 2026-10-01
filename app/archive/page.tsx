"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Customer={id:number;name:string;organization:string;phone:string;email:string;area:string;message:string;created_at:string};
type Doc={id:number;file_name:string;content_type:string;size:number;created_at:string};

export default function Archive(){
  const [authorized,setAuthorized]=useState<boolean|null>(null);
  const [password,setPassword]=useState("");
  const [customers,setCustomers]=useState<Customer[]>([]);
  const [selected,setSelected]=useState<Customer|null>(null);
  const [files,setFiles]=useState<Doc[]>([]);
  const [sort,setSort]=useState<"name"|"phone"|"area">("name");
  const [error,setError]=useState("");
  const load=async()=>{const r=await fetch("/api/archive/customers");if(r.status===401){setAuthorized(false);return}const d=await r.json();setCustomers(d.customers||[]);setAuthorized(true)};
  useEffect(()=>{
    let active=true;
    void fetch("/api/archive/customers").then(async r=>{
      if(!active)return;
      if(r.status===401){setAuthorized(false);return}
      const d=await r.json();
      if(active){setCustomers(d.customers||[]);setAuthorized(true)}
    });
    return()=>{active=false};
  },[]);
  const login=async(e:React.FormEvent)=>{e.preventDefault();setError("");const r=await fetch("/api/archive/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});if(!r.ok){setError("كلمة المرور غير صحيحة");return}await load()};
  const openCustomer=async(c:Customer)=>{setSelected(c);const r=await fetch(`/api/archive/files?customerId=${c.id}`);const d=await r.json();setFiles(d.files||[])};
  const upload=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!selected)return;const form=new FormData(e.currentTarget);form.set("customerId",String(selected.id));const r=await fetch("/api/archive/files",{method:"POST",body:form});if(r.ok){e.currentTarget.reset();await openCustomer(selected)}};
  const ordered=useMemo(()=>[...customers].sort((a,b)=>String(a[sort]).localeCompare(String(b[sort]),"ar")),[customers,sort]);

  if(authorized===null)return <main className="archive-shell"><p>جاري فتح الأرشيف…</p></main>;
  if(!authorized)return <main className="archive-shell"><section className="archive-login"><div className="archive-icon">▤</div><h1>أرشيف العملاء</h1><p>مساحة إدارية محمية لسجلات العملاء ووثائقهم.</p><form onSubmit={login}><label>كلمة المرور<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoFocus/></label>{error&&<p className="archive-error">{error}</p>}<button>دخول آمن</button></form><Link href="/">العودة إلى الموقع</Link></section></main>;

  return <main className="archive-shell" dir="rtl">
    <header className="archive-head"><div><span>▤</span><div><h1>أرشيف العملاء</h1><p>سجل المراسلات والوثائق</p></div></div><div><a className="archive-export" href="/api/archive/export">تنزيل ملف Excel</a><Link href="/">الموقع الرئيسي</Link></div></header>
    <section className="archive-toolbar"><b>{customers.length} عميل</b><label>فرز حسب<select value={sort} onChange={e=>setSort(e.target.value as "name"|"phone"|"area")}><option value="name">الاسم</option><option value="phone">رقم الهاتف</option><option value="area">المجال</option></select></label></section>
    <div className="archive-grid">
      <section className="archive-table-wrap"><table className="archive-table"><thead><tr><th>الاسم</th><th>الهاتف</th><th>البريد الإلكتروني</th><th>المجال</th><th>التاريخ</th></tr></thead><tbody>{ordered.map(c=><tr key={c.id} onClick={()=>openCustomer(c)} className={selected?.id===c.id?"active":""}><td><b>{c.name}</b><small>{c.organization}</small></td><td dir="ltr">{c.phone}</td><td dir="ltr">{c.email||"—"}</td><td>{c.area}</td><td>{new Date(c.created_at).toLocaleDateString("ar")}</td></tr>)}</tbody></table>{!customers.length&&<p className="archive-empty">لا توجد مراسلات مسجلة بعد.</p>}</section>
      <aside className="client-folder">{selected?<><div className="folder-title"><span>📁</span><div><h2>{selected.name}</h2><p>{selected.organization}</p></div></div><dl><dt>الهاتف</dt><dd dir="ltr">{selected.phone}</dd><dt>البريد الإلكتروني</dt><dd dir="ltr">{selected.email||"—"}</dd><dt>المجال</dt><dd>{selected.area}</dd><dt>المراسلة</dt><dd>{selected.message}</dd></dl><h3>الوثائق والمراسلات</h3><form className="upload-form" onSubmit={upload}><input name="file" type="file" required/><button>رفع وثيقة</button><small>الحد الأقصى 20 MB للملف.</small></form><div className="files-list">{files.map(f=><a key={f.id} href={`/api/archive/files/${f.id}`}><span>▧</span><div><b>{f.file_name}</b><small>{Math.ceil(f.size/1024)} KB</small></div></a>)}{!files.length&&<p>لا توجد وثائق مرفوعة لهذا العميل.</p>}</div></>:<div className="folder-placeholder"><span>📁</span><p>اختر عميلاً لفتح مجلده.</p></div>}</aside>
    </div>
  </main>;
}
