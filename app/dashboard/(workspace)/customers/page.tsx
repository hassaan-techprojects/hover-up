"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, Package, Phone, RefreshCw, Search, ShoppingBag, Users } from "lucide-react";

type CustomerOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string | number;
  createdAt: string;
  items: { productName: string; quantity: number }[];
};

type Customer = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  hasAccount: boolean;
  isActive: boolean;
  createdAt: string;
  totalOrders: number;
  totalSpent: number;
  orders: CustomerOrder[];
};

type CustomerStats = {
  totalCustomers: number;
  registeredCustomers: number;
  repeatCustomers: number;
  paidRevenue: number;
};

const money = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(value);

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");

export default function DashboardCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats>({ totalCustomers: 0, registeredCustomers: 0, repeatCustomers: 0, paidRevenue: 0 });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadCustomers = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/dashboard/customers${params.size ? `?${params.toString()}` : ""}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load customers.");
      setCustomers(data.customers ?? []);
      setStats(data.stats ?? { totalCustomers: 0, registeredCustomers: 0, repeatCustomers: 0, paidRevenue: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCustomers(query); }, [loadCustomers, query]);

  const visibleCustomers = useMemo(() => customers, [customers]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] tracking-[0.2em] text-[#a18c75]">CUSTOMER RELATIONSHIPS</p>
          <h1 className="mt-2 text-3xl font-semibold text-[#111] sm:text-4xl">Customers</h1>
          <p className="mt-2 text-sm text-[#817b72]">Customer profiles, contact information, purchase history and paid order value.</p>
        </div>
        <button type="button" onClick={() => void loadCustomers(query)} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e6dfd5] bg-white px-4 text-xs font-medium text-[#51483f] hover:border-[#b99a76] disabled:opacity-50">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh customers
        </button>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total customers", value: stats.totalCustomers.toLocaleString("en-IN"), icon: Users },
          { label: "Registered accounts", value: stats.registeredCustomers.toLocaleString("en-IN"), icon: Users },
          { label: "Repeat customers", value: stats.repeatCustomers.toLocaleString("en-IN"), icon: ShoppingBag },
          { label: "Paid order revenue", value: money(stats.paidRevenue), icon: ArrowUpRight },
        ].map((stat) => {
          const Icon = stat.icon;
          return <div key={stat.label} className="rounded-2xl border border-[#ebe6de] bg-white p-5">
            <div className="flex items-center justify-between"><p className="text-xs text-[#817b72]">{stat.label}</p><span className="rounded-xl bg-[#f5f1eb] p-2.5 text-[#92785e]"><Icon size={17} /></span></div>
            <p className="mt-4 break-words text-2xl font-semibold tracking-tight text-[#111]">{stat.value}</p>
          </div>;
        })}
      </section>

      <section className="rounded-2xl border border-[#ebe6de] bg-white p-4 sm:p-5">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a49a8d]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone or customer ID..." className="h-11 w-full rounded-lg border border-[#e9e4dc] pl-9 pr-3 text-xs outline-none focus:border-[#b99a76]" />
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-[#fff5f2] px-4 py-3 text-xs text-[#a14d3d]">{error}</p>}
        {loading ? <div className="mt-5 space-y-3">{[1,2,3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-[#f4f1ec]" />)}</div>
        : visibleCustomers.length === 0 ? <div className="py-16 text-center"><Users size={30} className="mx-auto text-[#b99a76]" /><p className="mt-4 text-sm font-medium text-[#51483f]">No customers found</p><p className="mt-1 text-xs text-[#999]">Customer details will appear here after an order or account registration.</p></div>
        : <div className="mt-5 space-y-3">
          {visibleCustomers.map((customer) => {
            const isExpanded = expanded === customer.id;
            return <article key={customer.id} className="overflow-hidden rounded-xl border border-[#eee9e2] bg-white">
              <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3eee6] text-sm font-semibold uppercase text-[#8b7054]">{customer.fullName.split(/\s+/).map(part => part[0]).slice(0,2).join("") || "C"}</div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-[#24211d]">{customer.fullName}</p><p className="mt-1 truncate text-[10px] text-[#999]">Customer ID: {customer.id}</p><span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold ${customer.hasAccount ? "bg-[#edf5ed] text-[#47724b]" : "bg-[#f4f1ec] text-[#81766a]"}`}>{customer.hasAccount ? "Registered account" : "Guest customer"}</span></div>
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="flex min-w-0 items-center gap-2 text-xs text-[#6f675d]"><Mail size={13} className="shrink-0 text-[#a18c75]" /><span className="truncate">{customer.email}</span></p>
                  <p className="flex items-center gap-2 text-xs text-[#6f675d]"><Phone size={13} className="shrink-0 text-[#a18c75]" />{customer.phone || "No phone number"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 lg:gap-6">
                  <div><p className="text-[10px] text-[#999]">Orders</p><p className="mt-1 text-sm font-semibold text-[#24211d]">{customer.totalOrders}</p></div>
                  <div><p className="text-[10px] text-[#999]">Paid total</p><p className="mt-1 text-sm font-semibold text-[#24211d]">{money(customer.totalSpent)}</p></div>
                </div>
                <button type="button" onClick={() => setExpanded(isExpanded ? null : customer.id)} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#e7e1d8] px-3 text-[10px] font-semibold text-[#6b6054] hover:border-[#b99a76]">{isExpanded ? "Hide orders" : "View orders"} <Package size={13} /></button>
              </div>
              {isExpanded && <div className="border-t border-[#eee9e2] bg-[#fcfbf9] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">CUSTOMER ORDER HISTORY</p><Link href="/dashboard/orders" className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8b7054] underline">Open orders <ArrowUpRight size={12} /></Link></div>
                {customer.orders.length === 0 ? <p className="py-5 text-xs text-[#999]">No orders have been placed yet.</p> : <div className="space-y-2">{customer.orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#eee8df] bg-white p-3">
                  <div><p className="text-xs font-semibold text-[#29251f]">{order.orderNumber}</p><p className="mt-1 text-[10px] text-[#999]">{new Date(order.createdAt).toLocaleString("en-IN")} · {order.items.reduce((sum,item)=>sum+item.quantity,0)} item(s)</p><p className="mt-1 text-[10px] text-[#8b7864]">{order.items.map(item=>item.productName).join(", ")}</p></div>
                  <div className="text-right"><p className="text-xs font-semibold text-[#29251f]">{money(Number(order.totalAmount))}</p><p className="mt-1 text-[10px] text-[#888]">{titleCase(order.status)} · Payment {titleCase(order.paymentStatus)}</p></div>
                </div>)}</div>}
              </div>}
            </article>;
          })}
        </div>}
      </section>
    </div>
  );
}
