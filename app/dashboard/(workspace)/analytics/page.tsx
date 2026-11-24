import { prisma } from "@/lib/prisma";

function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export default async function AnalyticsPage() {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const [orders30, paid30, paidAll, productCount, customerCount, statuses, latestOrders] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: since }, paymentStatus: "PAID" }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { totalAmount: true } }),
    prisma.product.count(),
    prisma.customer.count(),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { status: "asc" } }),
    prisma.order.findMany({ take: 8, orderBy: { createdAt: "desc" }, select: { id: true, orderNumber: true, status: true, paymentStatus: true, totalAmount: true, createdAt: true } }),
  ]);
  const cards = [
    ["Revenue · last 30 days", money(paid30._sum.totalAmount)],
    ["Lifetime paid revenue", money(paidAll._sum.totalAmount)],
    ["Orders · last 30 days", orders30.toLocaleString("en-IN")],
    ["Products", productCount.toLocaleString("en-IN")],
    ["Customers", customerCount.toLocaleString("en-IN")],
  ];
  return <div className="space-y-7">
    <header><p className="text-xs font-semibold tracking-[0.2em] text-[#a18c75]">STORE PERFORMANCE</p><h2 className="mt-2 text-3xl font-semibold text-[#171717]">Analytics</h2><p className="mt-2 text-sm text-[#777]">Live figures calculated from your orders, products and customers.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value])=><article key={label} className="rounded-2xl border border-[#ebe6de] bg-white p-5"><p className="text-sm text-[#777]">{label}</p><p className="mt-3 text-2xl font-semibold text-[#171717]">{value}</p></article>)}</section>
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><h3 className="text-lg font-semibold">Orders by status</h3><div className="mt-4 divide-y divide-[#eee]">{statuses.length ? statuses.map(item=><div key={item.status} className="flex justify-between py-3 text-sm"><span className="text-[#555]">{item.status.replaceAll("_"," ")}</span><strong>{item._count._all}</strong></div>) : <p className="py-6 text-sm text-[#888]">No orders yet.</p>}</div></div>
      <div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><h3 className="text-lg font-semibold">Latest orders</h3><div className="mt-4 divide-y divide-[#eee]">{latestOrders.length ? latestOrders.map(order=><div key={order.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-[#888]">{new Date(order.createdAt).toLocaleDateString("en-IN")} · {order.paymentStatus}</p></div><div className="text-right"><p className="text-sm font-semibold">{money(order.totalAmount)}</p><p className="mt-1 text-xs text-[#8b7054]">{order.status.replaceAll("_"," ")}</p></div></div>) : <p className="py-6 text-sm text-[#888]">No orders yet.</p>}</div></div>
    </section>
  </div>;
}
