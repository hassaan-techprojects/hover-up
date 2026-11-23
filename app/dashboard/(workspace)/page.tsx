"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  IndianRupee,
  Package,
  RefreshCw,
  ShoppingBag,
  Truck,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  Plus,
  ChevronDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardStats = {
  totalOrders: number;
  deliveredOrders: number;
  processingOrders: number;
  shippedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  totalProducts: number;
  publishedProducts: number;
  draftOrInactiveProducts: number;
  totalCustomers: number;
  totalRevenue: number;
};

type DashboardOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  customer: { id: string; firstName: string; lastName: string | null };
};

type DashboardData = {
  stats: DashboardStats;
  chart: { date: string; label: string; orders: number; processing: number; shipped: number; delivered: number; cancelled: number }[];
  recentOrders: DashboardOrder[];
};

const emptyStats: DashboardStats = {
  totalOrders: 0,
  deliveredOrders: 0,
  processingOrders: 0,
  shippedOrders: 0,
  cancelledOrders: 0,
  pendingOrders: 0,
  totalProducts: 0,
  publishedProducts: 0,
  draftOrInactiveProducts: 0,
  totalCustomers: 0,
  totalRevenue: 0,
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ageLabel(value: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 24) return "New";
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} old`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} old`;
}

function statusStyle(status: string) {
  if (status === "DELIVERED") return "bg-[#edf5ed] text-[#47724b]";
  if (status === "CANCELLED" || status === "REFUNDED") return "bg-[#faeeee] text-[#a34d4d]";
  if (status === "SHIPPED") return "bg-[#edf2f8] text-[#4f6c8c]";
  if (status === "PROCESSING") return "bg-[#f3eee5] text-[#8b704e]";
  return "bg-[#f5f1eb] text-[#81766a]";
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    stats: emptyStats,
    chart: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/dashboard/overview", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load dashboard data.");
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = [
    { title: "Total Revenue", value: formatPrice(data.stats.totalRevenue), helper: "Payments marked as paid", icon: IndianRupee },
    { title: "Total Orders", value: data.stats.totalOrders, helper: "All orders received", icon: ShoppingBag },
    { title: "Delivered Orders", value: data.stats.deliveredOrders, helper: "Successfully delivered", icon: CheckCircle2 },
    { title: "Total Products", value: data.stats.totalProducts, helper: `${data.stats.publishedProducts} published · ${data.stats.draftOrInactiveProducts} draft / inactive`, icon: Package },
    { title: "Total Customers", value: data.stats.totalCustomers, helper: "Unique customer records", icon: Users },
  ];

  const orderStatuses = [
    { label: "Processing", value: data.stats.processingOrders, icon: Clock3 },
    { label: "Shipped", value: data.stats.shippedOrders, icon: Truck },
    { label: "Delivered", value: data.stats.deliveredOrders, icon: CheckCircle2 },
    { label: "Cancelled", value: data.stats.cancelledOrders, icon: XCircle },
    { label: "Awaiting action", value: data.stats.pendingOrders, icon: ShoppingBag },
  ];

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[#a18c75]">YOUR STORE AT A GLANCE</p>
          <h1 className="mt-2 font-[var(--font-playfair)] text-3xl text-[#111111] sm:text-4xl">Store overview</h1>
          <p className="mt-2 text-sm text-[#817b72]">Live orders, products, customers and fulfilment performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void loadDashboard()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e6dfd5] bg-white px-4 text-xs font-medium text-[#51483f] transition hover:border-[#b99a76] disabled:opacity-50">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <div className="relative">
            <button type="button" onClick={() => setQuickActionsOpen((open) => !open)} aria-expanded={quickActionsOpen} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#111111] px-4 text-xs font-medium text-white transition hover:bg-[#b99a76] hover:text-[#111111]">
              <Plus size={15} /> Quick actions <ChevronDown size={13} />
            </button>
            {quickActionsOpen && (
              <div className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-[#e9e3da] bg-white p-1.5 shadow-xl">
                <Link onClick={() => setQuickActionsOpen(false)} href="/dashboard/products/new" className="block rounded-lg px-3 py-2.5 text-xs text-[#51483f] hover:bg-[#f7f4ef]">Upload a product</Link>
                <Link onClick={() => setQuickActionsOpen(false)} href="/dashboard/categories" className="block rounded-lg px-3 py-2.5 text-xs text-[#51483f] hover:bg-[#f7f4ef]">Create a category</Link>
                <Link onClick={() => setQuickActionsOpen(false)} href="/dashboard/banners" className="block rounded-lg px-3 py-2.5 text-xs text-[#51483f] hover:bg-[#f7f4ef]">Upload a banner</Link>
                <Link onClick={() => setQuickActionsOpen(false)} href="/dashboard/orders" className="block rounded-lg px-3 py-2.5 text-xs text-[#51483f] hover:bg-[#f7f4ef]">View orders</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-[#efd8d2] bg-[#fff7f4] px-4 py-3 text-xs text-[#a14d3d]">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.title} className="rounded-2xl border border-[#ebe6de] bg-white p-5 transition duration-200 hover:-translate-y-1 hover:shadow-md">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[#817b72]">{stat.title}</p>
                <div className="rounded-xl bg-[#f5f1eb] p-2.5 text-[#92785e]"><Icon size={18} strokeWidth={1.7} /></div>
              </div>
              <p className="mt-5 text-2xl font-semibold tracking-tight text-[#111111]">{loading ? "—" : stat.value}</p>
              <p className="mt-2 min-h-8 text-[10px] leading-4 text-[#aaa39a]">{stat.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <div className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#111111]">Sales overview & order analytics</h2>
              <p className="mt-1 text-xs text-[#999187]">Orders received each day over the last 30 days.</p>
            </div>
            <span className="rounded-lg bg-[#f7f4ef] px-3 py-2 text-[10px] text-[#786b5c]">Last 30 days</span>
          </div>
          <div className="mt-6 h-[280px] w-full">
            {data.chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chart} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b99a76" stopOpacity={0.28} /><stop offset="95%" stopColor="#b99a76" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid stroke="#eee9e2" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#948a7e", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={22} />
                  <YAxis allowDecimals={false} tick={{ fill: "#948a7e", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: "1px solid #e9e3da", borderRadius: 10, fontSize: 11 }} />
                  <Area type="monotone" dataKey="orders" name="Orders received" stroke="#9a7958" strokeWidth={2.5} fill="url(#ordersFill)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="flex h-full items-center justify-center rounded-xl bg-[#fcfbf9] text-xs text-[#aaa39a]">Order chart will appear when orders are received.</div>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {orderStatuses.map((item) => {
              const Icon = item.icon;
              return <div key={item.label} className="rounded-xl bg-[#faf8f5] p-3"><div className="flex items-center gap-1.5 text-[#8b7864]"><Icon size={13} /><span className="text-[10px]">{item.label}</span></div><p className="mt-2 text-lg font-semibold text-[#171717]">{loading ? "—" : item.value}</p></div>;
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-[#111111]">Recent activity</h2><p className="mt-1 text-xs text-[#999187]">The latest orders placed in your store.</p></div>
            <Link href="/dashboard/orders" className="text-[10px] font-medium text-[#92785e] underline underline-offset-4">All orders</Link>
          </div>
          <div className="mt-5 space-y-3">
            {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-xl bg-[#f5f2ed]" />) : data.recentOrders.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center text-center"><ShoppingBag size={24} className="text-[#b99a76]" /><p className="mt-3 text-xs font-medium text-[#625b52]">No recent orders</p><p className="mt-1 text-[10px] text-[#aaa39a]">New customer orders will appear here automatically.</p></div>
            ) : data.recentOrders.map((order) => (
              <Link key={order.id} href="/dashboard/orders" className="block rounded-xl border border-[#f0ece6] p-3 transition hover:border-[#d6c5b0] hover:bg-[#fcfbf9]">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#29251f]">{order.orderNumber}</p><p className="mt-1 truncate text-[10px] text-[#8d857a]">{order.customer.firstName} {order.customer.lastName || ""}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-medium ${statusStyle(order.status)}`}>{statusLabel(order.status)}</span></div>
                <div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-[#aaa39a]">{ageLabel(order.createdAt)} · {new Date(order.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span><span className="text-[11px] font-semibold text-[#51483f]">{formatPrice(order.totalAmount)}</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ebe6de] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#111111]">Product catalogue</h2><p className="mt-1 text-xs text-[#999187]">Live counts from your product database.</p></div><Link href="/dashboard/products" className="inline-flex items-center gap-1 text-[10px] font-medium text-[#92785e] underline underline-offset-4">Manage products <ArrowUpRight size={12} /></Link></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#faf8f5] p-4"><p className="text-[10px] text-[#817b72]">All products</p><p className="mt-2 text-2xl font-semibold text-[#171717]">{loading ? "—" : data.stats.totalProducts}</p></div>
          <div className="rounded-xl bg-[#faf8f5] p-4"><p className="text-[10px] text-[#817b72]">Published on website</p><p className="mt-2 text-2xl font-semibold text-[#47724b]">{loading ? "—" : data.stats.publishedProducts}</p></div>
          <div className="rounded-xl bg-[#faf8f5] p-4"><p className="text-[10px] text-[#817b72]">Draft / inactive</p><p className="mt-2 text-2xl font-semibold text-[#8b704e]">{loading ? "—" : data.stats.draftOrInactiveProducts}</p></div>
        </div>
      </section>
    </div>
  );
}
