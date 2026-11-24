"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Search } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string | number;
  createdAt: string;
  shippingAddress: Record<string, unknown>;
  items: { id: string; productName: string; quantity: number; totalPrice: string | number; customization?: Record<string, unknown> | null }[];
  payment: { method: string; status: string } | null;
  shipment: { status: string; trackingNumber: string | null; carrier: string | null } | null;
  statusHistory?: { description: string; metadata: unknown; createdAt: string }[];
  updatedAt?: string;
};

function money(value: number | string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));
}
function label(value: string) {
  if (value === "CONFIRMED") return "Received";
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}
function pill(value: string) {
  if (value === "DELIVERED") return "bg-[#edf5ed] text-[#47724b]";
  if (value === "CANCELLED" || value === "REFUNDED") return "bg-[#faeeee] text-[#a34d4d]";
  if (value === "SHIPPED" || value === "PROCESSING") return "bg-[#edf2f8] text-[#4f6c8c]";
  return "bg-[#f4f1ec] text-[#81766a]";
}

function OrderTimeline({ order }: { order: Order }) {
  const stages = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
  const currentIndex = stages.indexOf(order.status);
  const history = order.statusHistory ?? [];
  const events = history.map((entry) => {
    const metadata = entry.metadata && typeof entry.metadata === "object" ? entry.metadata as Record<string, unknown> : {};
    return { status: String(metadata.status || ""), createdAt: entry.createdAt };
  });
  const cancelled = order.status === "CANCELLED" || order.status === "REFUNDED";

  if (cancelled) {
    return <div className="rounded-xl border border-[#f0d8d5] bg-[#fff8f7] p-4">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8e5e3] text-[#a34d4d]">×</span><div><p className="text-xs font-semibold text-[#a34d4d]">{order.status === "CANCELLED" ? "Order cancelled" : "Order refunded"}</p><p className="mt-1 text-[10px] text-[#987b77]">{events.find(event => event.status === order.status) ? new Date(events.find(event => event.status === order.status)!.createdAt).toLocaleString("en-IN") : new Date(order.updatedAt || order.createdAt).toLocaleString("en-IN")}</p></div></div>
    </div>;
  }

  return <ol className="relative space-y-0">
    {stages.map((stage, index) => {
      const done = currentIndex >= index;
      const event = [...events].reverse().find(item => item.status === stage);
      const timestamp = event?.createdAt || (done && index === 0 ? order.createdAt : done && index === currentIndex ? order.updatedAt || order.createdAt : null);
      const isCurrent = currentIndex === index;
      return <li key={stage} className="relative flex min-h-[62px] gap-3">
        {index < stages.length - 1 && <span className={`absolute left-[11px] top-6 h-[calc(100%-2px)] w-px ${currentIndex > index ? "bg-[#b99a76]" : "bg-[#e9e4dc]"}`} />}
        <span className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[9px] ${done ? "border-[#a98b68] bg-[#a98b68] text-white" : "border-[#ded8cf] bg-white text-[#b5aca0]"} ${isCurrent ? "account-timeline-current" : ""}`}>{done ? "✓" : index + 1}</span>
        <div className="min-w-0 pb-4"><p className={`text-xs font-semibold ${done ? "text-[#3d352d]" : "text-[#aaa39a]"}`}>{stage === "CONFIRMED" ? "Received" : titleCaseStatus(stage)}</p><p className="mt-0.5 text-[10px] text-[#8e877e]">{stage === "PENDING" ? "Your order has been placed" : stage === "CONFIRMED" ? "Our team has received your order" : stage === "PROCESSING" ? "Your order is being prepared" : stage === "SHIPPED" ? "Your order is on its way" : "Your order has been delivered"}</p>{timestamp ? <p className="mt-1 text-[10px] text-[#999]">{new Date(timestamp).toLocaleString("en-IN")}</p> : done ? <p className="mt-1 text-[10px] text-[#999]">Earlier milestone · exact time not recorded</p> : <p className="mt-1 text-[10px] text-[#b5aea5]">Awaiting update</p>}</div>
      </li>;
    })}
  </ol>;
}

function titleCaseStatus(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
}

function displaySizeLabel(value: string) {
  const labels: Record<string, string> = {
    "41": "S",
    "43": "M",
    "45": "L",
    "47": "XL",
    "49": "2XL",
    "XXL": "2XL",
  };
  return labels[value.toUpperCase()] ?? value;
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/account/orders", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!active) return;
        if (response.ok) {
          setSignedIn(true);
          setOrders(data.orders || []);
          setCustomerName([data.customer?.firstName, data.customer?.lastName].filter(Boolean).join(" ") || "Customer");
          setCustomerEmail(data.customer?.email || "");
          setCustomerPhone(data.customer?.phone || "");
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLookupLoading(true);
    setError("");
    setOrders([]);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email, phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Order not found.");
      const foundOrders = data.orders || (data.order ? [data.order] : []);
      setOrders(foundOrders);
      setExpandedOrder(foundOrders[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find your order.");
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-[#faf9f7] px-5 py-12 text-[#171717] md:px-10 md:py-16">
        <div className="mx-auto max-w-[1050px]">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">YOUR HOVER UP ACCOUNT</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="text-3xl font-semibold sm:text-4xl">{signedIn ? `Hello, ${customerName}` : "Track your order"}</h1><p className="mt-2 text-sm text-[#888]">{signedIn ? "Your order history and delivery updates." : "Look up with your order number alone, or use the email and phone number entered at checkout."}</p></div>
            {!signedIn && <Link href="/account/login" className="text-xs font-semibold text-[#8b7054] underline">Sign in to your account</Link>}
          </div>

          {!signedIn && (
            <form onSubmit={lookup} className="mt-8 grid gap-4 rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:grid-cols-3 sm:p-6">
              <label className="text-xs font-medium text-[#5f574e]">Order number<input value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} placeholder="Enter order number" className="mt-2 h-11 w-full rounded-xl border border-[#e7e2da] px-3 text-sm outline-none focus:border-[#b99a76]" /></label>
              <label className="text-xs font-medium text-[#5f574e]">Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 h-11 w-full rounded-xl border border-[#e7e2da] px-3 text-sm outline-none focus:border-[#b99a76]" /></label>
              <label className="text-xs font-medium text-[#5f574e]">Contact number<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone used at checkout" className="mt-2 h-11 w-full rounded-xl border border-[#e7e2da] px-3 text-sm outline-none focus:border-[#b99a76]" /></label>
              <div className="sm:col-span-3"><button disabled={lookupLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171717] px-5 text-xs font-semibold tracking-wide text-white transition hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50"><Search size={14} /> {lookupLoading ? "SEARCHING..." : "FIND ORDER"}</button></div>
            </form>
          )}

          {error && <p role="alert" className="mt-5 rounded-xl border border-[#ead8cb] bg-[#fff8f2] px-4 py-3 text-sm text-[#945a3a]">{error}</p>}

          {signedIn && <section className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
            <div className="rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-6">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-[#a18c75]">MY PROFILE</p>
              <p className="mt-3 text-xl font-semibold text-[#24211d]">{customerName}</p>
              <p className="mt-2 text-xs text-[#777]">{customerEmail}</p>
              <p className="mt-1 text-xs text-[#777]">{customerPhone || "Phone number not added"}</p>
              <Link href="/account" className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8b7054] underline">Account settings <ArrowRight size={12} /></Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e9e4dc] bg-white p-5"><p className="text-[10px] text-[#999]">Total orders</p><p className="mt-3 text-2xl font-semibold text-[#24211d]">{orders.length}</p></div>
              <div className="rounded-2xl border border-[#e9e4dc] bg-white p-5"><p className="text-[10px] text-[#999]">Delivered</p><p className="mt-3 text-2xl font-semibold text-[#47724b]">{orders.filter(order => order.status === "DELIVERED").length}</p></div>
              <div className="col-span-2 rounded-2xl border border-[#e9e4dc] bg-[#f7f3ed] p-5"><p className="text-[10px] text-[#8b7864]">Total paid</p><p className="mt-2 text-2xl font-semibold text-[#24211d]">{money(orders.filter(order => order.paymentStatus === "PAID").reduce((sum, order) => sum + Number(order.totalAmount), 0))}</p><p className="mt-1 text-[10px] text-[#8b7864]">Confirmed payments across your orders</p></div>
            </div>
          </section>}

          {loading ? <div className="mt-8 h-36 animate-pulse rounded-2xl bg-[#efede9]" /> : orders.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-[#e9e4dc] bg-white px-6 py-14 text-center">
              <Package size={30} className="mx-auto text-[#b99a76]" />
              <p className="mt-4 text-sm font-semibold">{signedIn ? "No orders yet" : "No order displayed yet"}</p>
              <p className="mt-2 text-xs text-[#999]">{signedIn ? "Your future purchases will appear here." : "Enter your order details above to track a purchase."}</p>
              {signedIn && <Link href="/shop" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#8b7054] underline">Explore products <ArrowRight size={13} /></Link>}
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {orders.map(order => (
                <article key={order.id} className="overflow-hidden rounded-2xl border border-[#e9e4dc] bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div><p className="text-xs font-bold">{order.orderNumber}</p><p className="mt-1 text-[10px] text-[#999]">Placed {new Date(order.createdAt).toLocaleDateString("en-IN")}</p><p className="mt-2 text-sm font-semibold">{money(order.totalAmount)}</p></div>
                    <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${pill(order.status)}`}>{label(order.status)}</span><button type="button" onClick={()=>setExpandedOrder(expandedOrder===order.id?null:order.id)} className="rounded-lg border border-[#e7e1d8] px-3 py-2 text-[10px] font-semibold">{expandedOrder===order.id?"Hide details":"Order details"}</button></div>
                  </div>
                  {expandedOrder === order.id && (
                    <div className="grid gap-5 border-t border-[#eee9e2] bg-[#fcfbf9] p-5 sm:grid-cols-2">
                      <div><h2 className="text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">ITEMS</h2><div className="mt-3 space-y-3">{order.items.map(item=>{
                        const custom = item.customization || {};
                        const sizes = Array.isArray(custom.sizeBreakdown) ? custom.sizeBreakdown as { size: string; quantity: number }[] : [];
                        return <div key={item.id} className="rounded-xl border border-[#eee8df] bg-white p-3">
                          <div className="flex justify-between gap-3"><p className="text-xs font-semibold">{item.productName}</p><p className="text-xs font-semibold">{money(item.totalPrice)}</p></div>
                          <p className="mt-1 text-[10px] text-[#999]">Quantity: {item.quantity}</p>
                          {custom.packSize != null ? <p className="mt-2 text-[10px] text-[#8b7054]">Pack of {String(custom.packSize)}</p> : null}
                          {sizes.length>0 && <div className="mt-2 flex flex-wrap gap-1.5">{sizes.map(size=><span key={size.size} className="rounded-md bg-[#f5f1eb] px-2 py-1 text-[10px]">{displaySizeLabel(size.size)}: {size.quantity}</span>)}</div>}
                          {custom.textOnlyDesign === true && <p className="mt-2 text-[10px] font-semibold text-[#8b7054]">Text-only design requested</p>}
                          <div className="mt-3 flex flex-wrap gap-3">
                            {typeof custom.frontImageUrl==="string" && <a href={custom.frontImageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#8b7054] underline">Front logo</a>}
                            {typeof custom.backImageUrl==="string" && <a href={custom.backImageUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#8b7054] underline">Back logo</a>}
                          </div>
                          {typeof custom.customizationNotes==="string" && custom.customizationNotes && <p className="mt-2 text-[11px] leading-5 text-[#777]">Customization: {custom.customizationNotes}</p>}
                        </div>;
                      })}</div></div>
                      <div><h2 className="text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">DELIVERY ADDRESS</h2><div className="mt-3 rounded-xl border border-[#eee8df] bg-white p-4 text-xs leading-6 text-[#6d655c]">{order.shippingAddress.addressLine1 ? <><p className="font-semibold text-[#171717]">{String(order.shippingAddress.fullName || "")}</p><p>{String(order.shippingAddress.addressLine1 || "")}</p><p>{String(order.shippingAddress.addressLine2 || "")}</p><p>{String(order.shippingAddress.city || "")}, {String(order.shippingAddress.state || "")} {String(order.shippingAddress.postalCode || "")}</p><p>{String(order.shippingAddress.country || "India")}</p></> : <p className="text-[11px] leading-5 text-[#8b7864]">For privacy, delivery details are shown after verifying your checkout email and phone number.</p>}</div><h2 className="mt-4 text-[10px] font-semibold tracking-[0.15em] text-[#8b7864]">ORDER JOURNEY</h2><div className="mt-3 rounded-xl border border-[#eee8df] bg-white p-4"><OrderTimeline order={order} /><div className="mt-2 border-t border-[#eee8df] pt-3"><p className="text-[11px] text-[#888]">Payment: {label(order.paymentStatus)} · {order.payment?.method || "—"}</p>{order.shipment?.carrier && <p className="mt-2 text-[11px] text-[#888]">Carrier: {order.shipment.carrier}</p>}{order.shipment?.trackingNumber && <p className="mt-1 text-[11px] text-[#888]">Tracking: {order.shipment.trackingNumber}</p>}</div></div></div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
