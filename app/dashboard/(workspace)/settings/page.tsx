"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";

const fields = [
  { key: "store_name", label: "Store name", placeholder: "Hover Up" },
  { key: "support_email", label: "Support email", placeholder: "support@example.com" },
  { key: "support_phone", label: "Support phone", placeholder: "+91…" },
  { key: "store_address", label: "Store address", placeholder: "Business address" },
  { key: "currency", label: "Currency", placeholder: "INR" },
] as const;

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard/settings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load settings.");
      setValues(Object.fromEntries(fields.map(field => [field.key, String(data.settings?.[field.key] ?? "")])));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load settings."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/dashboard/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: values }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save settings.");
      setValues(Object.fromEntries(fields.map(field => [field.key, String(data.settings?.[field.key] ?? "")])));
      setNotice("Store settings saved successfully.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save settings."); }
    finally { setSaving(false); }
  }

  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.2em] text-[#a18c75]">STORE CONFIGURATION</p><h2 className="mt-2 text-3xl font-semibold">Settings</h2><p className="mt-2 text-sm text-[#777]">Manage the store name, contact details and display currency.</p></div><button onClick={()=>void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5dfd6] bg-white px-4 text-sm"><RefreshCw size={15}/> Reload</button></header>
    {error&&<p role="alert" className="rounded-xl bg-[#fff2ef] p-4 text-sm text-[#9a4538]">{error}</p>}{notice&&<p className="rounded-xl bg-[#edf5ed] p-4 text-sm text-[#47724b]">{notice}</p>}
    <form onSubmit={save} className="max-w-3xl rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-7"><div className="grid gap-5 sm:grid-cols-2">{fields.map(field=><label key={field.key} className="block text-sm font-medium text-[#51483f]">{field.label}<input disabled={loading} value={values[field.key]||""} onChange={event=>setValues(current=>({...current,[field.key]:event.target.value}))} placeholder={field.placeholder} className="mt-2 h-11 w-full rounded-lg border border-[#e5dfd6] px-3 text-sm text-[#222] outline-none focus:border-[#b99a76] disabled:bg-[#f8f6f2]"/></label>)}</div><div className="mt-7 flex justify-end"><button disabled={loading||saving} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#171717] px-5 text-sm font-semibold text-white disabled:opacity-50"><Save size={16}/>{saving?"Saving…":"Save settings"}</button></div></form>
    <p className="max-w-3xl text-xs leading-6 text-[#888]">These settings are stored in the database. Payment gateway credentials and secrets are intentionally not editable on this general settings screen.</p>
  </div>;
}
