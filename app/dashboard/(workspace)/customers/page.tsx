"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Users, ShoppingBag, Truck, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

type Item = { id: string; productName: string; variantName: string | null; quantity: number; totalPrice: string | number; customization: Record<string, unknown> | null };
type Order = { id: string; orderNumber: string; status: string; paymentStatus: string; totalAmount: string | number; createdAt: string; shippingAddress: Record<string, unknown>; items: Item[]; payment: { method: string; transactionId: string | null; paidAt: string | null } | null; shipment: { status: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; shippedAt: string | null; deliveredAt: string | null } | null };
type Customer = { id: string; userId: string | null; firstName: string; lastName: string | null; email: string; phone: string | null; createdAt: string; addresses: { id: string; fullName: string; phone: string; addressLine1: string; addressLine2: string | null; city: string; state: string; postalCode: string; country: string; isDefault: boolean }[]; orders: Order[] };
type Data = { stats: { totalCustomers: number; orderedCustomers: number; shippedCustomers: number; deliveredCustomers: number }; customers: Customer[] };

const money = (v: string | number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v));
const label = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replaceAll("_", " ");
const badge = (v: string) => v === "DELIVERED" ? "bg-[#edf5ed] text-[#47724b]" : v === "CANCELLED" || v === "REFUNDED" ? "bg-[#faeeee] text-[#a34d4d]" : v === "SHIPPED" ? "bg-[#edf2f8] text-[#4f6c8c]" : "bg-[#f5f1eb] text-[#81766a]";

export default function CustomersPage() {
  const [data, setData] = useState<Data>({ stats: { totalCustomers: 0, orderedCustomers: 0, shippedCustomers: 0, deliveredCustomers: 0 }, customers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/dashboard/customers", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load customers.");
      setData(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load customers."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => data.customers.filter((c) => {
    const q = search.trim().toLowerCase();
    const haystack = [c.id, c.firstName, c.lastName || "", c.email, c.phone || "", ...c.orders.map(o => o.orderNumber)].join(" ").toLowerCase();
    const matches = !q || haystack.includes(q);
    const byFilter = filter === "ALL" || (filter === "ORDERED" && c.orders.length > 0) || (filter === "SHIPPED" && c.orders.some(o => o.status === "SHIPPED")) || (filter === "DELIVERED" && c.orders.some(o => o.status === "DELIVERED"));
    return matches && byFilter;
  }), [data.customers, search, filter]);

  const cards = [
    ["Total customers", data.stats.totalCustomers, Users],
    ["Placed orders", data.stats.orderedCustomers, ShoppingBag],
    ["Shipped customers", data.stats.shippedCustomers, Truck],
    ["Delivered customers", data.stats.deliveredCustomers, CheckCircle2],
  ] as const;

  return <div className="mx-auto w-full max-w-[1680px] space-y-6">
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] tracking-[0.2em] text-[#a18c75]">CUSTOMER RELATIONSHIPS</p><h1 className="mt-2 text-3xl font-semibold text-[#171717]">Customers</h1><p className="mt-2 text-sm text-[#817b72]">Unique customer IDs include both guest checkout and registered customers.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e6dfd5] bg-white px-4 text-xs text-[#51483f]"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh</button>
    </section>
    {error && <p role="alert" className="rounded-lg bg-[#fff5f2] p-3 text-xs text-[#a14d3d]">{error}</p>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([title, value, Icon]) => <div key={title} className="rounded-2xl border border-[#ebe6de] bg-white p-5"><div className="flex items-center justify-between"><p className="text-xs text-[#817b72]">{title}</p><Icon size={17} className="text-[#a18c75]"/></div><p className="mt-3 text-2xl font-semibold text-[#171717]">{loading ? "—" : value}</p></div>)}</section>
    <section className="rounded-2xl border border-[#ebe6de] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a49a8d]"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer ID, name, email or order..." className="h-10 w-full rounded-lg border border-[#e9e4dc] pl-9 pr-3 text-xs outline-none focus:border-[#b99a76]"/></div>
        <div className="flex flex-wrap gap-1.5">{[["ALL","All"],["ORDERED","Placed orders"],["SHIPPED","Shipped"],["DELIVERED","Delivered"]].map(([v,t]) => <button key={v} onClick={() => setFilter(v)} className={`rounded-lg px-3 py-2 text-[10px] ${filter === v ? "bg-[#171717] text-white" : "bg-[#f7f5f1] text-[#786f64]"}`}>{t}</button>)}</div>
      </div>
      <p className="mt-4 text-[10px] text-[#999]">{loading ? "Loading customers..." : `${visible.length} customer records`} · Unique customer IDs</p>
      {loading ? <div className="mt-4 space-y-3">{[1,2,3].map(n => <div key={n} className="h-20 animate-pulse rounded-xl bg-[#f5f2ed]"/>)}</div> : visible.length === 0 ? <div className="py-16 text-center text-xs text-[#999]">No customers match this filter.</div> : <div className="mt-4 space-y-3">
        {visible.map(c => { const open = expanded === c.id; return <article key={c.id} className="overflow-hidden rounded-xl border border-[#eee9e2]">
          <button type="button" onClick={() => setExpanded(open ? null : c.id)} className="grid w-full gap-3 p-4 text-left sm:grid-cols-[1.2fr_1.2fr_0.8fr_auto] sm:items-center">
            <div><p className="text-xs font-semibold text-[#25211c]">{c.firstName} {c.lastName || ""}</p><p className="mt-1 text-[10px] text-[#999]">Customer ID: {c.id}</p></div>
            <div><p className="text-[11px] text-[#51483f]">{c.email}</p><p className="mt-1 text-[10px] text-[#999]">{c.phone || "No phone number"}</p></div>
            <div><p className="text-xs font-semibold text-[#171717]">{c.orders.length} order(s)</p><p className="mt-1 text-[10px] text-[#999]">{c.userId ? "Registered account" : "Guest customer"}</p></div>
            <span className="flex items-center justify-end gap-2 text-[10px] text-[#8b7864]">{open ? "Hide details" : "Full details"} {open ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
          </button>
          {open && <div className="border-t border-[#eee9e2] bg-[#fcfbf9] p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-[#eee9e2] bg-white p-4"><h3 className="text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">CUSTOMER PROFILE</h3><p className="mt-3 text-xs text-[#51483f]">Customer ID: {c.id}</p><p className="mt-2 text-xs text-[#51483f]">{c.email}</p><p className="mt-2 text-xs text-[#51483f]">{c.phone || "No phone number"}</p><p className="mt-2 text-xs text-[#51483f]">{c.userId ? "Registered account" : "Guest checkout"}</p><p className="mt-2 text-xs text-[#51483f]">Since {new Date(c.createdAt).toLocaleString("en-IN")}</p></div>
              <div className="rounded-xl border border-[#eee9e2] bg-white p-4"><h3 className="text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">SAVED ADDRESSES</h3>{c.addresses.length ? c.addresses.map(a => <div key={a.id} className="mt-3 border-b border-[#f0ece6] pb-3 text-[11px] leading-5 text-[#6d655c] last:border-0"><p className="font-semibold text-[#25211c]">{a.fullName} {a.isDefault ? "· Default" : ""}</p><p>{a.addressLine1} {a.addressLine2 || ""}</p><p>{a.city}, {a.state} {a.postalCode}, {a.country}</p><p>{a.phone}</p></div>) : <p className="mt-3 text-xs text-[#999]">No saved address.</p>}</div>
            </div>
            <h3 className="mt-5 text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">ORDER HISTORY & CUSTOMER ARTWORK</h3>
            {c.orders.length ? <div className="mt-3 space-y-3">{c.orders.map(o => <div key={o.id} className="rounded-xl border border-[#eee9e2] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold text-[#25211c]">{o.orderNumber}</p><p className="mt-1 text-[10px] text-[#999]">{new Date(o.createdAt).toLocaleString("en-IN")}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[9px] ${badge(o.status)}`}>{label(o.status)}</span><span className="text-xs font-semibold">{money(o.totalAmount)}</span></div></div>
              <div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-lg bg-[#faf8f5] p-3"><p className="text-[10px] font-semibold text-[#8b7864]">PAYMENT</p><p className="mt-2 text-[11px] text-[#655c52]">{o.payment?.method || "—"} · {label(o.paymentStatus)}</p><p className="mt-1 break-all text-[10px] text-[#999]">Transaction: {o.payment?.transactionId || "Not available"}</p>{o.payment?.paidAt && <p className="mt-1 text-[10px] text-[#999]">Paid: {new Date(o.payment.paidAt).toLocaleString("en-IN")}</p>}</div>
                <div className="rounded-lg bg-[#faf8f5] p-3"><p className="text-[10px] font-semibold text-[#8b7864]">SHIPPING</p><p className="mt-2 text-[11px] text-[#655c52]">{o.shipment?.status ? label(o.shipment.status) : "Not shipped"}</p><p className="mt-1 text-[10px] text-[#999]">{o.shipment?.carrier || "Carrier not assigned"} {o.shipment?.trackingNumber || ""}</p><p className="mt-2 text-[10px] leading-5 text-[#999]">{String(o.shippingAddress.addressLine1 || "")} {String(o.shippingAddress.addressLine2 || "")}, {String(o.shippingAddress.city || "")}, {String(o.shippingAddress.state || "")} {String(o.shippingAddress.postalCode || "")}, {String(o.shippingAddress.country || "")}</p>{o.shipment?.trackingUrl && <a href={o.shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#8b7054] underline">Track shipment <ExternalLink size={10}/></a>}{o.shipment?.deliveredAt && <p className="mt-1 text-[10px] text-[#999]">Delivered: {new Date(o.shipment.deliveredAt).toLocaleString("en-IN")}</p>}</div></div>
              <div className="mt-3 space-y-2">{o.items.map(item => { const custom = item.customization || {}; const sizes = Array.isArray(custom.sizeBreakdown) ? custom.sizeBreakdown as {size:string;quantity:number}[] : []; return <div key={item.id} className="rounded-lg border border-[#f0ece6] p-3"><div className="flex justify-between gap-3"><p className="text-xs font-semibold">{item.productName}</p><p className="text-xs font-semibold">{money(item.totalPrice)}</p></div><p className="mt-1 text-[10px] text-[#888]">Quantity: {item.quantity} · {item.variantName || "Standard"}</p>{typeof custom.size === "string" && <p className="mt-1 text-[10px] text-[#888]">Size: {custom.size}</p>}{typeof custom.packSize === "number" && <p className="mt-1 text-[10px] text-[#8b7054]">Pack of {custom.packSize}</p>}{sizes.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{sizes.map(s => <span key={s.size} className="rounded-md bg-[#f5f1eb] px-2 py-1 text-[10px]">{s.size}: {s.quantity}</span>)}</div>}<div className="mt-2 flex flex-wrap gap-3">{typeof custom.frontImageUrl === "string" && <a href={custom.frontImageUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 text-[10px] text-[#8b7054]"><img src={custom.frontImageUrl} alt="Customer front artwork" className="h-16 w-16 rounded-md border border-[#e8e3dc] object-contain"/>Front artwork</a>}{typeof custom.backImageUrl === "string" && <a href={custom.backImageUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 text-[10px] text-[#8b7054]"><img src={custom.backImageUrl} alt="Customer back artwork" className="h-16 w-16 rounded-md border border-[#e8e3dc] object-contain"/>Back artwork</a>}</div>{typeof custom.customizationNotes === "string" && custom.customizationNotes && <p className="mt-2 text-[10px] leading-5 text-[#777]">Instructions: {custom.customizationNotes}</p>}</div>; })}</div>
            </div>)}</div> : <p className="mt-3 rounded-lg bg-white p-4 text-xs text-[#999]">This customer has not placed an order yet.</p>}
          </div>}
        </article>; })}
      </div>}
    </section>
  </div>;
}
