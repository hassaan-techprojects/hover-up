"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Search, CheckCircle2, Image as ImageIcon, X } from "lucide-react";
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
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8e5e3] text-[#a34d4d]">×</span><div><p className="text-sm font-semibold text-[#a34d4d]">{order.status === "CANCELLED" ? "Order cancelled" : "Order refunded"}</p><p className="mt-1 text-xs text-[#987b77]">{events.find(event => event.status === order.status) ? new Date(events.find(event => event.status === order.status)!.createdAt).toLocaleString("en-IN") : new Date(order.updatedAt || order.createdAt).toLocaleString("en-IN")}</p></div></div>
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
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/account/orders", { cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!active) return;
        if (response.ok) {
          setSignedIn(true);
          setOrders(data.orders || []);
          setExpandedOrder(data.orders?.[0]?.id ?? null);
          setCustomerName([data.customer?.firstName, data.customer?.lastName].filter(Boolean).join(" ") || "Customer");
          setCustomerEmail(data.customer?.email || "");
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
          <p className="text-sm font-semibold tracking-[0.14em] text-[#8b7054]">YOUR HOVER UP ACCOUNT</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div><h1 className="text-3xl font-semibold sm:text-4xl">My Orders</h1><p className="mt-2 text-base text-[#777]">{signedIn ? `Welcome back, ${customerName}. Follow your orders and delivery updates here.` : "Look up with your order number alone, or use the email and phone number entered at checkout."}</p></div>
            {!signedIn && <Link href="/account/login" className="text-xs font-semibold text-[#8b7054] underline">Sign in to your account</Link>}
          </div>

          <nav aria-label="Customer account" className="mt-7 flex flex-wrap gap-2 border-b border-[#e7e1d8] pb-3">
            <Link href="/account" className="rounded-xl border border-[#b99a76] bg-[#b99a76]/10 px-5 py-3 text-sm font-semibold text-[#5d4936]">Account</Link>
            <Link href="/account/orders" aria-current="page" className="rounded-xl bg-[#171717] px-5 py-3 text-base font-bold text-white">My Orders</Link>
            <Link href="/account/track-order" className="rounded-xl border border-[#e8e3dc] bg-white px-5 py-3 text-base font-bold text-[#5f574e]">Track Order</Link>
          </nav>

          {!signedIn && (
            <form onSubmit={lookup} className="mt-8 grid gap-4 rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:grid-cols-3 sm:p-6">
              <label className="text-xs font-medium text-[#5f574e]">Order number<input value={orderNumber} onChange={e=>setOrderNumber(e.target.value)} placeholder="Enter order number" className="mt-2 h-11 w-full rounded-xl border border-[#e7e2da] px-3 text-sm outline-none focus:border-[#b99a76]" /></label>
              <label className="text-xs font-medium text-[#5f574e]">Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 h-11 w-full rounded-xl border border-[#e7e2da] px-3 text-sm outline-none focus:border-[#b99a76]" /></label>
              <label className="text-xs font-medium text-[#5f574e]">Contact number<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Phone used at checkout" className="mt-2 h-11 w-full rounded-xl border border-[#e7e2da] px-3 text-sm outline-none focus:border-[#b99a76]" /></label>
              <div className="sm:col-span-3"><button disabled={lookupLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171717] px-5 text-xs font-semibold tracking-wide text-white transition hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50"><Search size={14} /> {lookupLoading ? "SEARCHING..." : "FIND ORDER"}</button></div>
            </form>
          )}

          {error && <p role="alert" className="mt-5 rounded-xl border border-[#ead8cb] bg-[#fff8f2] px-4 py-3 text-sm text-[#945a3a]">{error}</p>}

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
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee9e2] p-6 sm:p-7">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.16em] text-[#8b7054]">ORDER ID</p>
                      <p className="mt-1 text-xl font-extrabold tracking-wide text-black sm:text-2xl">{order.orderNumber}</p>
                      <p className="mt-2 text-sm text-[#777]">Placed {new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                      <p className="mt-3 text-3xl font-extrabold text-[#218343] sm:text-4xl">{money(order.totalAmount)}</p>
                      <p className="mt-1 text-xs font-semibold text-[#218343]">TOTAL AMOUNT</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-4 py-2 text-sm font-bold ${pill(order.status)}`}>{label(order.status)}</span>
                      <button type="button" onClick={()=>setExpandedOrder(expandedOrder===order.id?null:order.id)} className="rounded-lg border border-[#171717] px-4 py-3 text-sm font-bold text-black">{expandedOrder===order.id?"Hide details":"View bill"}</button>
                    </div>
                  </div>
                  {expandedOrder === order.id && (
                    <div className="grid gap-5 border-t border-[#eee9e2] bg-[#fcfbf9] p-5 sm:grid-cols-2">
                      <div>
                        <h2 className="text-base font-extrabold tracking-wide text-black sm:text-lg">ORDER ITEMS</h2>
                        <div className="mt-4 space-y-4">{order.items.map(item=>{
                          const custom = item.customization || {};
                          const sizes = Array.isArray(custom.sizeBreakdown) ? custom.sizeBreakdown as { size: string; quantity: number }[] : [];
                          const frontImage = typeof custom.frontImageUrl === "string" ? custom.frontImageUrl : "";
                          const backImage = typeof custom.backImageUrl === "string" ? custom.backImageUrl : "";
                          const noLogo = custom.textOnlyDesign === true;
                          return <div key={item.id} className="rounded-xl border border-[#e5dfd6] bg-white p-5 sm:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <p className="text-lg font-extrabold text-black sm:text-xl">{item.productName}</p>
                              <p className="text-lg font-bold text-black">{money(item.totalPrice)}</p>
                            </div>
                            <div className="mt-4 inline-flex rounded-md bg-[#171717] px-4 py-2 text-base font-extrabold tracking-wide text-white">PACK OF {Number(custom.packSize) || item.quantity || 2}</div>
                            <div className="mt-4">
                              <p className="text-base font-extrabold text-black">SIZE BREAKDOWN</p>
                              {sizes.length > 0 ? <div className="mt-2 space-y-2">{sizes.map(size=><p key={size.size} className="text-base font-semibold text-[#292929]">{displaySizeLabel(size.size)} {size.size} - {String(size.quantity).padStart(2,"0")} pcs</p>)}</div> : <p className="mt-2 text-base text-[#777]">Quantity: {item.quantity} pcs</p>}
                            </div>
                            <div className="mt-5 border-t border-[#eee9e2] pt-4">
                              <p className="text-sm font-bold text-[#51483e]">YOUR DESIGN</p>
                              {noLogo ? <p className="mt-3 flex items-center gap-2 text-base font-bold text-[#218343]"><CheckCircle2 size={21}/> I don’t have a logo — create a design using my text</p> : (
                                <div className="mt-3 flex flex-wrap gap-4">
                                  {frontImage && <button type="button" onClick={()=>setZoomImage({url:frontImage,title:"Front design"})} className="group text-left"><span className="block h-32 w-32 overflow-hidden rounded-lg border border-[#e5dfd6] bg-[#faf9f7] sm:h-40 sm:w-40"><img src={frontImage} alt="Front uploaded design" className="h-full w-full object-contain p-2 transition group-hover:scale-105"/></span><span className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#51483e]"><ImageIcon size={15}/> Front design · Click to zoom</span></button>}
                                  {backImage && <button type="button" onClick={()=>setZoomImage({url:backImage,title:"Back design"})} className="group text-left"><span className="block h-32 w-32 overflow-hidden rounded-lg border border-[#e5dfd6] bg-[#faf9f7] sm:h-40 sm:w-40"><img src={backImage} alt="Back uploaded design" className="h-full w-full object-contain p-2 transition group-hover:scale-105"/></span><span className="mt-2 flex items-center gap-1 text-sm font-semibold text-[#51483e]"><ImageIcon size={15}/> Back design · Click to zoom</span></button>}
                                  {!frontImage && !backImage && <p className="text-base text-[#777]">No logo or design image uploaded.</p>}
                                </div>
                              )}
                              {typeof custom.customizationNotes === "string" && custom.customizationNotes.trim() && <div className="mt-4 rounded-lg bg-[#f8f6f2] p-4"><p className="text-sm font-bold text-[#51483e]">TEXT / SPECIAL INSTRUCTIONS</p><p className="mt-2 whitespace-pre-wrap text-base leading-7 text-[#333]">{custom.customizationNotes}</p></div>}
                            </div>
                          </div>;
                        })}</div>
                      </div>
                      <div><h2 className="text-base font-extrabold tracking-wide text-black">DELIVERY ADDRESS</h2><div className="mt-3 rounded-xl border border-[#eee8df] bg-white p-4 text-xs leading-6 text-[#6d655c]">{order.shippingAddress.addressLine1 ? <><p className="font-semibold text-[#171717]">{String(order.shippingAddress.fullName || "")}</p><p>{String(order.shippingAddress.addressLine1 || "")}</p><p>{String(order.shippingAddress.addressLine2 || "")}</p><p>{String(order.shippingAddress.city || "")}, {String(order.shippingAddress.state || "")} {String(order.shippingAddress.postalCode || "")}</p><p>{String(order.shippingAddress.country || "India")}</p></> : <p className="text-[11px] leading-5 text-[#8b7864]">For privacy, delivery details are shown after verifying your checkout email and phone number.</p>}</div><h2 className="mt-4 text-base font-extrabold tracking-wide text-black">ORDER JOURNEY</h2><div className="mt-3 rounded-xl border border-[#eee8df] bg-white p-4"><OrderTimeline order={order} /><div className="mt-2 border-t border-[#eee8df] pt-3"><p className="text-base font-bold text-black">Payment Method: {order.payment?.method === "COD" ? "Cash on Delivery" : order.payment?.method || "—"}</p><p className="mt-2 text-sm text-[#666]">Payment status: {label(order.paymentStatus)}</p>{order.shipment?.carrier && <p className="mt-2 text-[11px] text-[#888]">Carrier: {order.shipment.carrier}</p>}{order.shipment?.trackingNumber && <p className="mt-1 text-[11px] text-[#888]">Tracking: {order.shipment.trackingNumber}</p>}</div></div></div>
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
