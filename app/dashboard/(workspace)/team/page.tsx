"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Save, Users } from "lucide-react";

type Member = { id: string; name: string | null; email: string; role: "ADMIN" | "ANALYST"; isActive: boolean; lastLoginAt: string | null; createdAt: string };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { role: string; isActive: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard/team", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load team.");
      setMembers(data.users || []);
      setDrafts(Object.fromEntries((data.users || []).map((user: Member) => [user.id, { role: user.role, isActive: user.isActive }])));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load team."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSaving(id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/dashboard/team", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: id, ...draft }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save team member.");
      setMembers(current => current.map(member => member.id === id ? data.user : member));
      setNotice("Team member updated successfully.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save team member."); }
    finally { setSaving(null); }
  }

  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold tracking-[0.2em] text-[#a18c75]">ACCESS MANAGEMENT</p><h2 className="mt-2 text-3xl font-semibold">Team & Roles</h2><p className="mt-2 text-sm text-[#777]">Manage administrator and analyst access to the dashboard.</p></div><button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e5dfd6] bg-white px-4 text-sm"><RefreshCw size={15}/> Refresh</button></header>
    {error&&<p role="alert" className="rounded-xl bg-[#fff2ef] p-4 text-sm text-[#9a4538]">{error}</p>}{notice&&<p className="rounded-xl bg-[#edf5ed] p-4 text-sm text-[#47724b]">{notice}</p>}
    <section className="overflow-hidden rounded-2xl border border-[#ebe6de] bg-white"><div className="flex items-center gap-3 border-b border-[#eee] p-5"><Users className="text-[#9b846a]"/><div><h3 className="font-semibold">Dashboard team</h3><p className="text-xs text-[#888]">{members.length} staff accounts</p></div></div>
      {loading?<p className="p-8 text-sm text-[#888]">Loading team members…</p>:members.length===0?<p className="p-8 text-sm text-[#888]">No administrator or analyst accounts found.</p>:<div className="divide-y divide-[#eee]">{members.map(member=><div key={member.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_150px_140px_auto] lg:items-center"><div className="min-w-0"><p className="truncate text-sm font-semibold">{member.name||"Team member"}</p><p className="mt-1 truncate text-xs text-[#888]">{member.email}</p><p className="mt-1 text-xs text-[#aaa]">Last login: {member.lastLoginAt?new Date(member.lastLoginAt).toLocaleString("en-IN"):"Not recorded"}</p></div><label className="text-xs text-[#777]">Role<select value={drafts[member.id]?.role||member.role} onChange={event=>setDrafts(current=>({...current,[member.id]:{...current[member.id],role:event.target.value,isActive:current[member.id]?.isActive??member.isActive}}))} className="mt-1 h-10 w-full rounded-lg border border-[#e5dfd6] bg-white px-2 text-sm text-[#222]"><option value="ADMIN">Administrator</option><option value="ANALYST">Analyst</option></select></label><label className="flex items-center gap-2 text-sm text-[#555]"><input type="checkbox" checked={drafts[member.id]?.isActive??member.isActive} onChange={event=>setDrafts(current=>({...current,[member.id]:{...current[member.id],role:current[member.id]?.role||member.role,isActive:event.target.checked}}))}/> Active account</label><button disabled={saving===member.id} onClick={()=>void save(member.id)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171717] px-4 text-sm font-semibold text-white disabled:opacity-50"><Save size={15}/>{saving===member.id?"Saving…":"Save"}</button></div>)}</div>}
    </section>
    <p className="text-xs leading-6 text-[#888]">Customer accounts are managed separately. At least one active administrator must remain, and you cannot remove your own administrator access.</p>
  </div>;
}
