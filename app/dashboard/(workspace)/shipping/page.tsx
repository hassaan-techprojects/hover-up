"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search, Truck, ExternalLink } from "lucide-react";

type ShipmentOrder = {
  id: string; orderNumber: string; status: string; createdAt: string; totalAmount: string | number;
  customer: { id: string; firstName: string; lastName: string | null; email: string; phone: string | null };
  shipment: { status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; expectedDeliveryAt: string | null; shippedAt: string | null } | null;
};
export default function ShippingPage() {
  const [orders,setOrders] = useState<ShipmentOrder[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard/orders",{cache:"no-store"});
      const data = await response.json();
      if(!response.ok) throw new Error(data.error || "Unable to load shipments.");
      setOrders((data.orders || []).filter((order: ShipmentOrder) => order.status === "SHIPPED"));
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to load shipments."); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load();},[load]);
  const visible = useMemo(()=>orders.filter(order=>{
    const q=query.trim().toLowerCase();
    return !q || [order.orderNumber,order.customer.id,order.customer.firstName,order.customer.lastName || "",order.customer.email,order.customer.phone || "",order.shipment?.trackingNumber || ""].join(" ").toLowerCase().includes(q);
  }),[orders,query]);
  return <div className="mx-auto w-full max-w-[1680px] space-y-6">
    <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] tracking-[0.2em] text-[#a18c75]">FULFILMENT MANAGEMENT</p><h1 className="mt-2 text-3xl font-semibold text-[#171717]">Shipping</h1><p className="mt-2 text-sm text-[#817b72]">Orders marked as shipped by the administrator appear here.</p></div><button onClick={()=>void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e6dfd5] bg-white px-4 text-xs text-[#51483f]"><RefreshCw size={14} className={loading?"animate-spin":""}/> Refresh</button></section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><p className="text-xs text-[#817b72]">Currently shipping</p><p className="mt-3 text-2xl font-semibold">{loading?"—":orders.length}</p></div><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><p className="text-xs text-[#817b72]">Search matches</p><p className="mt-3 text-2xl font-semibold">{loading?"—":visible.length}</p></div><div className="rounded-2xl border border-[#ebe6de] bg-white p-5"><p className="text-xs text-[#817b72]">Tracking numbers added</p><p className="mt-3 text-2xl font-semibold">{loading?"—":orders.filter(o=>o.shipment?.trackingNumber).length}</p></div></section>
    <section className="rounded-2xl border border-[#ebe6de] bg-white p-5"><div className="relative max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a49a8d]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search order ID, customer ID, phone or tracking..." className="h-10 w-full rounded-lg border border-[#e9e4dc] pl-9 pr-3 text-xs outline-none focus:border-[#b99a76]"/></div>
      {error&&<p role="alert" className="mt-4 rounded-lg bg-[#fff5f2] p-3 text-xs text-[#a14d3d]">{error}</p>}
      {loading?<div className="mt-5 h-28 animate-pulse rounded-xl bg-[#f4f1ec]"/>:visible.length===0?<div className="py-16 text-center"><Truck size={28} className="mx-auto text-[#b99a76]"/><p className="mt-3 text-sm font-medium text-[#51483f]">No shipped orders found</p><p className="mt-1 text-xs text-[#999]">When an order status changes to Shipped, it will appear here.</p></div>:<div className="mt-5 space-y-3">{visible.map(order=><article key={order.id} className="grid gap-4 rounded-xl border border-[#eee9e2] p-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center"><div><p className="text-xs font-bold text-[#171717]">{order.orderNumber}</p><p className="mt-1 text-[10px] text-[#999]">Customer ID: {order.customer.id}</p><p className="mt-1 text-[10px] text-[#999]">{new Date(order.createdAt).toLocaleString("en-IN")}</p></div><div><p className="text-xs font-semibold">{order.customer.firstName} {order.customer.lastName||""}</p><p className="mt-1 text-[10px] text-[#888]">{order.customer.email}</p><p className="mt-1 text-[10px] text-[#888]">{order.customer.phone||"—"}</p></div><div><p className="text-xs text-[#51483f]">Carrier: {order.shipment?.carrier||"Not assigned"}</p><p className="mt-1 text-[10px] text-[#888]">Tracking: {order.shipment?.trackingNumber||"Not added"}</p><p className="mt-1 text-[10px] text-[#888]">Expected: {order.shipment?.expectedDeliveryAt?new Date(order.shipment.expectedDeliveryAt).toLocaleDateString("en-IN"):"Not set"}</p></div><div className="flex flex-wrap gap-2">{order.shipment?.trackingUrl&&<a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e8e3dc] px-3 text-[10px] text-[#8b7054]">Track <ExternalLink size={12}/></a>}<Link href="/dashboard/orders" className="inline-flex h-9 items-center rounded-lg bg-[#171717] px-3 text-[10px] font-semibold text-white">Manage order</Link></div></article>)}</div>}
    </section>
  </div>;
}
