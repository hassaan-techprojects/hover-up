import Link from "next/link";
import { IndianRupee, ShoppingBag, Package, Users, ArrowUpRight, Clock3 } from "lucide-react";
import { prisma } from "@/lib/prisma";

function money(value: unknown) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function DashboardPage() {
  const [products, orders, customers, revenue, recentOrders, recentActivity] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { totalAmount: true } }),
    prisma.order.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { customer: { select: { firstName: true, lastName: true, email: true } } } }),
    prisma.activityLog.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } }),
  ]);

  const stats = [
    { title: "Paid revenue", value: money(revenue._sum.totalAmount), description: "Confirmed payments", icon: IndianRupee },
    { title: "Total orders", value: orders.toLocaleString("en-IN"), description: "All recorded orders", icon: ShoppingBag },
    { title: "Total products", value: products.toLocaleString("en-IN"), description: "Products in your catalogue", icon: Package },
    { title: "Total customers", value: customers.toLocaleString("en-IN"), description: "Registered customers", icon: Users },
  ];

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-[#a18c75]">YOUR STORE AT A GLANCE</p>
          <h2 className="mt-2 font-[var(--font-playfair)] text-3xl text-[#111111] sm:text-4xl">Welcome back.</h2>
          <p className="mt-2 text-base text-[#817b72]">Live store totals from your database.</p>
        </div>
        <Link href="/dashboard/products/new" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#b99a76] hover:text-[#111111]">
          <Package size={16} /> Add product
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return <article key={stat.title} className="rounded-2xl border border-[#ebe6de] bg-white p-5 transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#817b72]">{stat.title}</p>
              <div className="rounded-xl bg-[#f5f1eb] p-2.5 text-[#92785e]"><Icon size={19} strokeWidth={1.7} /></div>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight text-[#111111]">{stat.value}</p>
            <p className="mt-2 text-xs text-[#999187]">{stat.description}</p>
          </article>;
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-lg font-semibold text-[#111111]">Recent orders</h3><p className="mt-1 text-sm text-[#999187]">The five latest customer orders.</p></div>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-[#8b7054] underline">View all</Link>
          </div>
          <div className="mt-5 divide-y divide-[#eee9e2]">
            {recentOrders.length ? recentOrders.map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-semibold text-[#222]">{order.orderNumber}</p><p className="mt-1 text-xs text-[#888]">{[order.customer.firstName, order.customer.lastName].filter(Boolean).join(" ") || order.customer.email} · {dateLabel(order.createdAt)}</p></div>
              <div className="text-right"><p className="text-sm font-semibold">{money(order.totalAmount)}</p><p className="mt-1 text-xs text-[#8b7054]">{order.status.replaceAll("_", " ")}</p></div>
            </div>) : <p className="py-8 text-center text-sm text-[#888]">No orders have been recorded yet.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><h3 className="text-lg font-semibold text-[#111111]">Recent activity</h3><p className="mt-1 text-sm text-[#999187]">Latest recorded changes in your store.</p></div>
            <Link href="/dashboard/activity-logs" className="text-sm font-semibold text-[#8b7054] underline">View logs</Link>
          </div>
          <div className="mt-5 divide-y divide-[#eee9e2]">
            {recentActivity.length ? recentActivity.map(entry => <div key={entry.id} className="flex gap-3 py-3">
              <Clock3 size={17} className="mt-0.5 shrink-0 text-[#a18c75]" />
              <div className="min-w-0"><p className="text-sm font-medium text-[#333]">{entry.description || entry.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[#999]">{entry.user?.name || entry.user?.email || "System"} · {dateLabel(entry.createdAt)}</p></div>
            </div>) : <p className="py-8 text-center text-sm text-[#888]">No activity has been recorded yet.</p>}
          </div>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        {[{ label: "Manage catalogue", href: "/dashboard/products" }, { label: "Review inventory", href: "/dashboard/inventory" }, { label: "Open analytics", href: "/dashboard/analytics" }].map(item => <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-xl border border-[#ebe6de] bg-white p-4 text-sm font-semibold text-[#333] transition hover:border-[#b99a76]">{item.label}<ArrowUpRight size={17} className="text-[#a18c75]" /></Link>)}
      </section>
    </div>
  );
}
