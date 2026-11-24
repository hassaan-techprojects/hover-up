import { prisma } from "@/lib/prisma";

export default async function ActivityLogsPage() {
  const logs = await prisma.activityLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
  return <div className="space-y-7">
    <header><p className="text-xs font-semibold tracking-[0.2em] text-[#a18c75]">AUDIT TRAIL</p><h2 className="mt-2 text-3xl font-semibold">Activity Logs</h2><p className="mt-2 text-sm text-[#777]">The latest 100 actions recorded by your store.</p></header>
    <section className="overflow-hidden rounded-2xl border border-[#ebe6de] bg-white"><div className="divide-y divide-[#eee]">{logs.map(log=><article key={log.id} className="grid gap-2 p-5 sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold text-[#222]">{log.description||log.action.replaceAll("_"," ")}</p><p className="mt-1 text-xs text-[#888]">{log.entity}{log.entityId?" · "+log.entityId:""} · {log.user?.name||log.user?.email||"System"}</p></div><time className="text-xs text-[#888]">{new Date(log.createdAt).toLocaleString("en-IN")}</time></article>)}{logs.length===0&&<p className="p-10 text-center text-sm text-[#888]">No activity has been recorded yet. Events will appear here as actions are logged.</p>}</div></section>
  </div>;
}
