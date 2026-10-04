"use client";

import { useEffect, useState } from "react";

import { type Lang, type SiteContent } from "./content/defaults";

export default function Home({ content }: { content: SiteContent }){
  const { services, projects, copy, contact } = content;
  const [lang,setLang]=useState<Lang>("ar"); const [menuOpen,setMenuOpen]=useState(false); const [sent,setSent]=useState(false);
  useEffect(()=>{const saved=localStorage.getItem("aes-language");if(saved==="ar"||saved==="en")queueMicrotask(()=>setLang(saved))},[]);
  useEffect(()=>{localStorage.setItem("aes-language",lang);document.documentElement.lang=lang;document.documentElement.dir=copy[lang].dir},[lang,copy]);
  useEffect(()=>{
    if(!menuOpen)return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==="Escape")setMenuOpen(false)};
    document.addEventListener("keydown",closeOnEscape);
    return ()=>document.removeEventListener("keydown",closeOnEscape);
  },[menuOpen]);
  const t=copy[lang], arrow=lang==="ar"?"←":"→";
  return <main dir={t.dir} className={`site-${lang}`}>
    <header className="nav-wrap">
      <div className="nav-main">
        <a className="brand" href="#top"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span><b>{t.name}</b><small>{t.sub}</small></span></a>
        <div className="nav-actions"><a className="archive-link" href="/archive">{lang==="ar"?"أرشيف العملاء":"Client Archive"}</a><button className="lang-switch" onClick={()=>setLang(lang==="ar"?"en":"ar")} aria-label="Switch language">{lang==="ar"?"EN":"العربية"}</button><a className="nav-cta" href="#contact">{t.cta}<span aria-hidden="true">{arrow}</span></a></div>
        <button className="menu-btn" onClick={()=>setMenuOpen(!menuOpen)} aria-label={lang==="ar"?"القائمة":"Menu"} aria-expanded={menuOpen} aria-controls="primary-navigation"><span/><span/></button>
      </div>
      <nav id="primary-navigation" className={menuOpen?"open":""} aria-label={lang==="ar"?"التنقل الرئيسي":"Main navigation"}>
        {t.nav.map((label,i)=><a href={["#about","#services","#projects","#method"][i]} key={label} onClick={()=>setMenuOpen(false)}>{label}</a>)}
        <div className="mobile-nav-actions"><a href="/archive">{lang==="ar"?"أرشيف العملاء":"Client Archive"}</a><button className="lang-switch" onClick={()=>setLang(lang==="ar"?"en":"ar")}>{lang==="ar"?"EN":"العربية"}</button><a className="nav-cta" href="#contact" onClick={()=>setMenuOpen(false)}>{t.cta}</a></div>
      </nav>
    </header>
    <section className="hero" id="top"><div className="grid-bg"/><div className="hero-copy"><p className="eyebrow"><span/>{t.eyebrow}</p><h1>{t.hero[0]}<br/><em>{t.hero[1]}</em></h1><p className="lead">{t.lead}</p><div className="hero-actions"><a className="primary" href="#contact">{t.start}<b>{arrow}</b></a><a className="secondary" href="#services">{t.explore}</a></div><div className="proof">{t.proof.map(x=><div key={x[0]}><strong>{x[0]}</strong><span>{x[1]}</span></div>)}</div></div><div className="hero-visual hero-diagram"><img src="/technology-consulting-help-clean.png" alt="Technology consulting capabilities diagram"/></div></section>
    <section className="statement" id="about"><p>{t.banner}</p><div className="statement-grid"><h2>{t.statement[0]}<br/><span>{t.statement[1]}</span></h2><div><p>{t.about1}</p><p>{t.about2}</p></div></div></section>
    <section className="services section" id="services"><div className="section-head"><div><p className="eyebrow dark"><span/>{t.servicesEye}</p><h2>{t.servicesTitle[0]}<br/><em>{t.servicesTitle[1]}</em></h2></div><p>{t.servicesIntro}</p></div><div className="service-grid">{services.map((s,i)=>{const x=s[lang];return <article key={x[0]}><div className="service-top"><span>{String(i+1).padStart(2,"0")}</span><small>{x[1]}</small></div><div className="service-symbol">{s.icon}</div><h3>{x[0]}</h3><p>{x[2]}</p><a href="#contact">{t.discuss} {arrow}</a></article>})}</div></section>
    <section className="projects section" id="projects"><div className="section-head"><div><p className="eyebrow"><span/>{t.projectsEye}</p><h2>{t.projectsTitle}</h2></div><p>{t.projectsIntro}</p></div><div className="project-grid">{projects.map((p,i)=>{const x=p[lang];return <article key={p.code}>{p.img&&<img className="project-image" src={p.img} alt={x[0]} loading="lazy"/>}<div className="project-mark"><b>{p.code}</b><span>{String(i+1).padStart(2,"0")}</span></div><small>{x[2]}</small><h3>{x[0]}</h3><p>{x[1]}</p>{p.video&&<a href={p.video} target="_blank" rel="noreferrer">{t.watch} ▶</a>}</article>})}</div></section>
    <section className="method section" id="method"><div className="method-intro"><p className="eyebrow"><span/>{t.methodEye}</p><h2>{t.methodTitle[0]}<br/>{t.methodTitle[1]}</h2><p>{t.methodIntro}</p><a href="#contact">{t.book}</a></div><div className="steps">{t.steps.map((x,i)=><div className="step" key={x[0]}><span>{String(i+1).padStart(2,"0")}</span><div><h3>{x[0]}</h3><p>{x[1]}</p></div></div>)}</div></section>
    <section className="network section"><div><p className="eyebrow dark"><span/>{t.networkEye}</p><h2>{t.networkTitle[0]}<br/><em>{t.networkTitle[1]}</em></h2></div><div className="network-card"><div className="network-brand"><img src="/arab-experts-network-logo.png" alt="Arab Experts Network"/><a href="https://arabexperts.net/" target="_blank" rel="noreferrer">{t.networkLink}<span>↗</span></a></div><p>{t.networkText}</p><ul>{t.networkList.map(x=><li key={x}>{x}</li>)}</ul></div></section>
    <section className="contact section" id="contact">
      <div className="contact-copy"><p className="eyebrow"><span/>{t.contactEye}</p><h2>{t.contactTitle[0]}<br/>{t.contactTitle[1]}</h2><p>{t.contactText}</p><Contact label={t.scope} value={t.scopeValue}/><Contact label={t.syria} value={contact.syriaPhone} href={`tel:${contact.syriaPhone.replace(/[^+\d]/g,"")}`}/><Contact label={t.oman} value={contact.omanPhone} href={`https://wa.me/${contact.omanPhone.replace(/\D/g,"")}`}/><Contact label={t.email} value={contact.email} href={`mailto:${contact.email}`}/><Contact label="LinkedIn" value={lang==="ar"?"مجموعة النظم الهندسية المؤتمتة":"Automated Engineering Systems Group"} href={contact.linkedin}/></div>
      <form onSubmit={async e=>{e.preventDefault();const f=e.currentTarget;const body=Object.fromEntries(new FormData(f));const res=await fetch("/api/inquiries",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});if(res.ok)setSent(true)}}>
        {sent?<div className="success"><b>{t.success}</b><p>{t.successText}</p><button type="button" onClick={()=>setSent(false)}>{t.again}</button></div>:<>
          <div className="two"><label>{t.fields[0]}<input name="name" required placeholder={t.place[0]}/></label><label>{t.fields[1]}<input name="organization" required placeholder={t.place[1]}/></label></div>
          <div className="two"><label>{t.fields[2]}<input name="phone" required placeholder={t.place[2]}/></label><label>{lang==="ar"?"البريد الإلكتروني للعميل":"Client Email"}<input name="email" type="email" required autoComplete="email" placeholder={lang==="ar"?"name@example.com":"name@example.com"}/></label></div>
          <label>{t.fields[3]}<select name="area" defaultValue="" required><option value="" disabled>{t.place[3]}</option>{services.map(s=><option key={s[lang][0]}>{s[lang][0]}</option>)}</select></label>
          <label>{t.fields[4]}<textarea name="message" required rows={4} placeholder={t.place[4]}/></label><button type="submit">{t.send}<b>{arrow}</b></button><small>{t.privacy}</small>
        </>}
      </form>
    </section>
    <footer><a className="brand light" href="#top"><span className="brand-mark"><i/><i/><i/></span><span><b>{t.name}</b><small>{t.sub}</small></span></a><p>{t.footer}</p><div><a href="#services">{t.nav[1]}</a><a href="#projects">{t.nav[2]}</a><a href="#method">{t.nav[3]}</a><a href="#contact">{t.cta}</a><a href={contact.linkedin} target="_blank" rel="noreferrer">LinkedIn ↗</a></div><small>© 2026 — Automated Engineering Systems</small></footer>
  </main>
}

function Contact({label,value,href}:{label:string,value:string,href?:string}){return <div className="contact-detail"><small>{label}</small><b>{href?<a href={href} target={href.startsWith("http")?"_blank":undefined} rel="noreferrer" dir="ltr">{value}</a>:value}</b></div>}
