"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SiteContent } from "../content/defaults";
import "./admin.css";

type Tab = "projects" | "services" | "copy";
type Language = "ar" | "en";
type ContentResponse = { content: SiteContent; revision: number; updatedAt: string };

const groups: { title: string; keys: (keyof SiteContent["copy"]["en"])[] }[] = [
  { title: "Brand and navigation", keys: ["name", "sub", "nav", "cta"] },
  { title: "Introduction", keys: ["eyebrow", "hero", "lead", "start", "explore", "proof", "banner", "statement", "about1", "about2"] },
  { title: "Services and projects", keys: ["servicesEye", "servicesTitle", "servicesIntro", "discuss", "projectsEye", "projectsTitle", "projectsIntro", "watch"] },
  { title: "Method and partners", keys: ["methodEye", "methodTitle", "methodIntro", "book", "steps", "networkEye", "networkTitle", "networkLink", "networkText", "networkList"] },
  { title: "Contact and footer", keys: ["contactEye", "contactTitle", "contactText", "scope", "scopeValue", "syria", "oman", "email", "fields", "place", "send", "privacy", "success", "successText", "again", "footer"] },
];

function fieldName(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, letter => letter.toUpperCase());
}

function requestError(data: unknown, fallback: string) {
  return data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : fallback;
}

function CopyField({ label, value, onChange }: { label: string; value: unknown; onChange: (value: unknown) => void }) {
  if (typeof value === "string") {
    if (value.length > 110) return <label className="admin-field"><span>{label}</span><textarea rows={4} value={value} onChange={event => onChange(event.target.value)} /></label>;
    return <label className="admin-field"><span>{label}</span><input value={value} onChange={event => onChange(event.target.value)} /></label>;
  }
  if (Array.isArray(value)) {
    return <div className="admin-nested"><strong>{label}</strong>{value.map((entry, index) => <CopyField key={index} label={`${label} · ${index + 1}`} value={entry} onChange={changed => {
      const next = [...value];
      next[index] = changed;
      onChange(next);
    }} />)}</div>;
  }
  return null;
}

export default function AdminPage() {
  const [status, setStatus] = useState<"checking" | "locked" | "ready">("checking");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [baseline, setBaseline] = useState("");
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<Tab>("projects");
  const [language, setLanguage] = useState<Language>("ar");
  const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const dirty = content !== null && JSON.stringify(content) !== baseline;

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/content", { cache: "no-store" });
    if (response.status === 401) { setStatus("locked"); return; }
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.content) {
      setStatus("locked");
      setNotice(requestError(data, "Could not load content. Check the database and admin secrets."));
      return;
    }
    const record = data as ContentResponse;
    setContent(record.content);
    setBaseline(JSON.stringify(record.content));
    setRevision(record.revision);
    setStatus("ready");
    setNotice("");
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(update: (draft: SiteContent) => void) {
    setContent(current => {
      if (!current) return current;
      const next = structuredClone(current);
      update(next);
      return next;
    });
    setNotice("");
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setNotice(requestError(data, "Sign in failed")); return; }
      setPassword("");
      await load();
    } catch { setNotice("Could not reach the server"); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    setContent(null);
    setBaseline("");
    setStatus("locked");
  }

  async function save() {
    if (!content || !dirty) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, revision }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) { setNotice(requestError(data, "Could not save changes")); return; }
      const record = data as ContentResponse;
      setContent(record.content);
      setBaseline(JSON.stringify(record.content));
      setRevision(record.revision);
      setNotice("Saved. The public website now uses this content.");
    } catch { setNotice("Could not reach the server"); }
    finally { setBusy(false); }
  }

  async function uploadImage(file: File, index: number) {
    setBusy(true);
    setNotice("");
    try {
      const form = new FormData();
      form.set("image", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) { setNotice(requestError(data, "Image upload failed")); return; }
      change(draft => { draft.projects[index].img = data.url; });
      setNotice("Image uploaded. Save changes to attach it to the project.");
    } catch { setNotice("Could not upload the image"); }
    finally { setBusy(false); }
  }

  if (status === "checking") return <main className="admin-shell"><p className="admin-loading">Opening content administration…</p></main>;
  if (status === "locked") return <main className="admin-shell admin-login-shell"><form className="admin-login" onSubmit={signIn}><span className="admin-kicker">AUTOMATED ENGINEERING SYSTEMS</span><h1>Content administration</h1><p>Sign in to edit the website’s projects, services and bilingual text.</p><label className="admin-field"><span>Admin password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required autoFocus /></label>{notice && <p className="admin-notice error" role="alert">{notice}</p>}<button className="admin-primary" disabled={busy}>Sign in</button><Link className="admin-return" href="/">Return to website</Link></form></main>;

  const items = tab === "projects" ? content?.projects : content?.services;
  const item = items?.[selected];
  return <main className="admin-shell"><header className="admin-header"><div><span className="admin-kicker">AES / CONTENT STUDIO</span><h1>Website content</h1><p>Edit text and images without changing source code.</p></div><div className="admin-header-actions"><Link href="/" target="_blank" rel="noreferrer">View website ↗</Link><button type="button" onClick={signOut}>Sign out</button></div></header>
    <div className="admin-toolbar"><div className="admin-tabs" role="tablist" aria-label="Content type"><button className={tab === "projects" ? "active" : ""} onClick={() => { setTab("projects"); setSelected(0); }}>Projects <span>{content?.projects.length}</span></button><button className={tab === "services" ? "active" : ""} onClick={() => { setTab("services"); setSelected(0); }}>Services <span>{content?.services.length}</span></button><button className={tab === "copy" ? "active" : ""} onClick={() => setTab("copy")}>Page text</button></div><div className="admin-save"><span>{dirty ? "Unsaved changes" : "All changes saved"}</span><button className="admin-primary" disabled={!dirty || busy} onClick={save}>{busy ? "Working…" : "Save changes"}</button></div></div>
    {notice && <p className={`admin-notice${notice.includes("Saved.") ? "" : " error"}`} role="status">{notice}</p>}
    {tab === "copy" && content ? <section className="admin-copy"><div className="admin-panel-heading"><div><h2>Page text</h2><p>Edit each language separately. The public layout stays the same.</p></div><div className="admin-language"><button className={language === "ar" ? "active" : ""} onClick={() => setLanguage("ar")}>Arabic</button><button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>English</button></div></div>{groups.map(group => <details key={group.title} className="admin-copy-group"><summary>{group.title}</summary><div dir={language === "ar" ? "rtl" : "ltr"}>{group.keys.map(key => <CopyField key={key} label={fieldName(key)} value={content.copy[language][key]} onChange={value => change(draft => { (draft.copy[language] as unknown as Record<string, unknown>)[key] = value; })} />)}</div></details>)}<details className="admin-copy-group"><summary>Contact details</summary><div>{(Object.keys(content.contact) as (keyof SiteContent["contact"])[]).map(key => <label key={key} className="admin-field"><span>{fieldName(key)}</span><input value={content.contact[key]} onChange={event => change(draft => { draft.contact[key] = event.target.value; })} /></label>)}</div></details></section> : null}
    {(tab === "projects" || tab === "services") && content ? <div className="admin-workspace"><aside className="admin-list"><div className="admin-list-head"><h2>{tab === "projects" ? "Previous projects" : "Services"}</h2><button onClick={() => { const next = tab === "projects" ? content.projects.length : content.services.length; change(draft => { if (tab === "projects") draft.projects.push({ code: `P${Date.now().toString(36).toUpperCase()}`, img: "", ar: ["مشروع جديد", "وصف المشروع", "الفئة"], en: ["New project", "Project description", "Category"] }); else draft.services.push({ icon: "✦", ar: ["خدمة جديدة", "الفئة", "وصف الخدمة"], en: ["New service", "Category", "Service description"] }); }); setSelected(next); }}>+ Add</button></div><p className="admin-help">Select an item to edit. Use the arrows to change its position on the website.</p><div className="admin-list-items">{items?.map((entry, index) => <button key={index} className={selected === index ? "active" : ""} onClick={() => setSelected(index)}><span>{String(index + 1).padStart(2, "0")}</span><b>{entry.en[0]}</b><small>{entry.ar[0]}</small></button>)}</div></aside>
      <section className="admin-editor">{item ? <><div className="admin-editor-head"><div><span className="admin-kicker">{tab.toUpperCase()} / {String(selected + 1).padStart(2, "0")}</span><h2>{item.en[0]}</h2></div><div className="admin-order"><button disabled={selected === 0} title="Move up" onClick={() => { change(draft => { const list = tab === "projects" ? draft.projects : draft.services; [list[selected - 1], list[selected]] = [list[selected], list[selected - 1]]; }); setSelected(selected - 1); }}>↑</button><button disabled={selected === (items?.length ?? 0) - 1} title="Move down" onClick={() => { change(draft => { const list = tab === "projects" ? draft.projects : draft.services; [list[selected + 1], list[selected]] = [list[selected], list[selected + 1]]; }); setSelected(selected + 1); }}>↓</button></div></div>
        <div className="admin-editor-body">{tab === "projects" && "code" in item ? <><div className="admin-grid-two"><label className="admin-field"><span>Project code</span><input value={item.code} onChange={event => change(draft => { draft.projects[selected].code = event.target.value; })} /></label><label className="admin-field"><span>Video link (optional)</span><input value={item.video || ""} onChange={event => change(draft => { draft.projects[selected].video = event.target.value; })} placeholder="https://…" /></label></div><div className="admin-image"><div>{item.img ? <img src={item.img} alt="Current project" /> : <span>No image selected</span>}</div><label>Upload a project image <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file, selected); event.target.value = ""; }} /></label><small>PNG, JPEG or WebP, up to 8 MB.</small></div></> : null}
        {tab === "services" && "icon" in item ? <label className="admin-field admin-icon-field"><span>Service symbol</span><input value={item.icon} onChange={event => change(draft => { draft.services[selected].icon = event.target.value; })} maxLength={16} /></label> : null}
        {(["ar", "en"] as const).map(lang => <fieldset key={lang} className="admin-language-fields" dir={lang === "ar" ? "rtl" : "ltr"}><legend>{lang === "ar" ? "Arabic content" : "English content"}</legend>{item[lang].map((value, index) => <label className="admin-field" key={index}><span>{index === 0 ? "Title" : index === (tab === "projects" ? 1 : 2) ? "Description" : "Category"}</span>{index === (tab === "projects" ? 1 : 2) ? <textarea rows={4} value={value} onChange={event => change(draft => { const entry = tab === "projects" ? draft.projects[selected] : draft.services[selected]; entry[lang][index] = event.target.value; })} /> : <input value={value} onChange={event => change(draft => { const entry = tab === "projects" ? draft.projects[selected] : draft.services[selected]; entry[lang][index] = event.target.value; })} />}</label>)}</fieldset>)}
        <button className="admin-delete" onClick={() => { if (!window.confirm(`Remove “${item.en[0]}” from the website? This takes effect after saving.`)) return; change(draft => { (tab === "projects" ? draft.projects : draft.services).splice(selected, 1); }); setSelected(Math.max(0, selected - 1)); }}>Remove this {tab === "projects" ? "project" : "service"}</button></div></> : <div className="admin-empty">No item selected. Add one from the list.</div>}</section></div> : null}
    <footer className="admin-footer">Changes appear on the public website after saving. Keep a database backup before major edits.</footer>
  </main>;
}
