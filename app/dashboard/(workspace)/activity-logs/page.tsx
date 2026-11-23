"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, History, Users, Clock3, ShieldCheck } from "lucide-react";

type UserActivity = { id:string; name:string|null; email:string; role:string; lastLoginAt:string|null; lastActiveAt:string|null; isActive:boolean; loginCount:number };
type Log = { id:string; action:string; entity:string; entityId:string|null; description:string|null; metadata:unknown; createdAt:string; user:{id:string;name:string|null;email:string;role:string}|null };
type Data = { users:UserActivity[]; logs:Log[]; serverTime?: string };
function ago(value:string|null, now:number) {
  if(!value) return "Never";
  const mins=Math.max(0,Math.floor((now-new Date(value).getTime())/60000));
  if(mins<1) return "Just now";
  if(mins<60) return `${mins} min ago`;
  const hours=Math.floor(mins/60);
  if(hours<24) return `${hours} hr ago`;
  const days=Math.floor(hours/24);
  if(days<7) return `${days} day(s) ago`;
  return `${Math.floor(days/7)} week(s) ago`;
}
export default function ActivityLogsPage() {
  const [data,setData]=useState<Data>({users:[],logs:[],serverTime:""});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/dashboard/activity-logs",{cache:"no-store"});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error||"Unable to load activity logs.");
      setData(result);
    }catch(e){setError(e instanceof Error?e.message:"Unable to load activity logs.");}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  const now=data.serverTime ? new Date(data.serverTime).getTime() : 0;
 const active=data.users.filter(user=>user.isActive&&user.lastActiveAt&&now-new Date(user.lastActiveAt).getTime()<120000).length;
  const logins=data.logs.filter(log=>log.action==="DASHBOARD_LOGIN").length;
  return <div className="mx-auto w-full max-w-[1680px] space-y-6">
    <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] tracking-[0.2em] text-[#a18c75]">SECURITY & WORKSPACE HISTORY</p><h1 className="mt-2 text-3xl font-semibold text-[#171717]">Activity logs</h1><p className="mt-2 text-sm text-[#817b72]">Dashboard sign-ins, sign-outs, order updates and review moderation.</p></div><button onClick={()=>void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e6dfd5] bg-white px-4 text-xs text-[#51483f]"><RefreshCw size={14} className={loading?"animate-spin":""}/> Refresh</button></section>
    {error&&<p role="alert" className="rounded-lg bg-[#fff5f2] p-3 text-xs text-[#a14d3d]">{error}</p>}
    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-[#817b72]">Admin & analyst accounts</p><Users size={17} className="text-[#a18c75]"/></div><p className="mt-3 text-2xl font-semibold">{loading?"—":data.users.length}</p></div><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-[#817b72]">Currently active (last 2 min)</p><ShieldCheck size={17} className="text-[#a18c75]"/></div><p className="mt-3 text-2xl font-semibold">{loading?"—":active}</p></div><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-[#817b72]">Recent dashboard logins</p><History size={17} className="text-[#a18c75]"/></div><p className="mt-3 text-2xl font-semibold">{loading?"—":logins}</p></div></section>
    <section className="rounded-2xl border border-[#ebe6de] bg-white p-5"><div className="flex items-center gap-2"><Users size={16} className="text-[#a18c75]"/><h2 className="text-sm font-semibold">Dashboard team activity</h2></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{loading?[1,2,3].map(n=><div key={n} className="h-24 animate-pulse rounded-xl bg-[#f4f1ec]"/>):data.users.map(user=>{const isActive=Boolean(user.lastActiveAt&&Date.now()-new Date(user.lastActiveAt).getTime()<120000&&user.isActive);return <article key={user.id} className="rounded-xl border border-[#eee9e2] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#25211c]">{user.name||user.email}</p><p className="mt-1 text-[10px] text-[#999]">{user.email}</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] ${isActive?"bg-[#edf5ed] text-[#47724b]":"bg-[#f4f1ec] text-[#81766a]"}`}>{isActive?"Active":"Away"}</span></div><div className="mt-3 grid grid-cols-2 gap-2"><div><p className="text-[9px] text-[#999]">Role</p><p className="mt-1 text-[11px]">{user.role==="ADMIN"?"Administrator":"Analyst"}</p></div><div><p className="text-[9px] text-[#999]">Dashboard logins</p><p className="mt-1 text-[11px]">{user.loginCount}</p></div><div><p className="text-[9px] text-[#999]">Last login</p><p className="mt-1 text-[10px]">{ago(user.lastLoginAt,now)}</p></div><div><p className="text-[9px] text-[#999]">Last active</p><p className="mt-1 text-[10px]">{ago(user.lastActiveAt,now)}</p></div></div></article>})}</div>
    </section>
    <section className="rounded-2xl border border-[#ebe6de] bg-white p-5"><div className="flex items-center gap-2"><Clock3 size={16} className="text-[#a18c75]"/><h2 className="text-sm font-semibold">Latest activity</h2></div>
      {loading?<div className="mt-4 h-28 animate-pulse rounded-xl bg-[#f4f1ec]"/>:data.logs.length===0?<p className="py-12 text-center text-xs text-[#999]">No activity has been recorded yet.</p>:<div className="mt-4 divide-y divide-[#f0ece6]">{data.logs.map(log=>{const meta=log.metadata&&typeof log.metadata==="object"?log.metadata as Record<string,unknown>:{};return <div key={log.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-medium text-[#38322b]">{log.description||log.action}</p><p className="mt-1 text-[10px] text-[#999]">{log.user?.name||log.user?.email||"System"} · {log.user?.role||"System"} · {log.entity}{log.entityId? ` · ${log.entityId}`:""}</p>{typeof meta.sessionMinutes==="number"&&<p className="mt-1 text-[10px] text-[#8b7054]">Session duration: {meta.sessionMinutes} minutes</p>}</div><p className="text-[10px] text-[#999]">{new Date(log.createdAt).toLocaleString("en-IN")}</p></div>})}</div>}
    </section>
  </div>;
}
