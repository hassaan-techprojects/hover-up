"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Search, PackageCheck, Truck, CheckCircle2 } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type TrackedOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  totalAmount?: string | number;
  createdAt: string;
  payment?: { method: string } | null;
  shipment?: { trackingNumber: string | null; carrier: string | null } | null;
};

const stages = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
const title = (value: string) => value === "CONFIRMED" ? "Order received" : value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " ");
const money = (value: number | string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function findOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim(), phone: phone.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We could not find that order. Check the details and try again.");
      const found = data.order || data.orders?.[0] || null;
      if (!found) throw new Error("No matching order was returned.");
      setOrder(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find your order right now.");
    } finally {
      setLoading(false);
    }
  }

  const currentIndex = order ? stages.indexOf(order.status) : -1;
  const cancelled = order?.status === "CANCELLED" || order?.status === "REFUNDED";

  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-[#faf9f7] px-5 py-12 text-[#171717] md:px-10 md:py-16">
        <div className="mx-auto max-w-[900px]">
          <p className="text-base font-extrabold tracking-[0.14em] text-[#8b7054]">HOVER UP ORDER SUPPORT</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">Track Order</h1>
          <p className="mt-3 text-lg leading-8 text-[#625b53]">Enter your order number to track it directly. If you do not have the order number, leave that field empty and enter both checkout email and phone number.</p>

          <nav aria-label="Customer account" className="mt-7 flex flex-wrap gap-2 border-b border-[#e7e1d8] pb-3">
            <Link href="/account" className="rounded-xl border border-[#e8e3dc] bg-white px-5 py-3 text-base font-bold text-[#5f574e]">Account</Link>
            <Link href="/account/orders" className="rounded-xl border border-[#e8e3dc] bg-white px-5 py-3 text-base font-bold text-[#5f574e]">My Orders</Link>
            <Link href="/account/track-order" aria-current="page" className="rounded-xl bg-[#171717] px-5 py-3 text-base font-bold text-white">Track Order</Link>
          </nav>

          <form onSubmit={findOrder} className="mt-8 grid gap-5 rounded-2xl border border-[#e9e4dc] bg-white p-6 sm:grid-cols-2 sm:p-8">
            <label className="text-base font-bold text-[#333] sm:col-span-2">Order number
              <input required value={orderNumber} onChange={event => setOrderNumber(event.target.value)} placeholder="Enter your order number (optional)" className="mt-2 w-full rounded-xl border border-[#e7e2da] px-4 py-3 text-base outline-none focus:border-[#b99a76]" />
            </label>
            <label className="text-base font-bold text-[#333]">Email address
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email used at checkout" className="mt-2 w-full rounded-xl border border-[#e7e2da] px-4 py-3 text-base outline-none focus:border-[#b99a76]" />
            </label>
            <label className="text-base font-bold text-[#333]">Contact number
              <input type="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="Phone used at checkout" className="mt-2 w-full rounded-xl border border-[#e7e2da] px-4 py-3 text-base outline-none focus:border-[#b99a76]" />
            </label>
            <p className="text-sm leading-6 text-[#777] sm:col-span-2">Order number alone is enough. Without it, both checkout email and phone number are required.</p>
            <div className="sm:col-span-2">
              <button disabled={loading} className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-black px-7 text-base font-extrabold text-white transition hover:bg-[#b99a76] hover:text-black disabled:opacity-60">
                <Search size={19} /> {loading ? "SEARCHING..." : "FIND MY ORDER"}
              </button>
            </div>
          </form>

          {error && <p role="alert" className="mt-5 rounded-xl border border-[#ead8cb] bg-[#fff8f2] px-5 py-4 text-base font-semibold text-[#945a3a]">{error}</p>}

          {order && (
            <section className="mt-8 overflow-hidden rounded-2xl border border-[#e9e4dc] bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee9e2] p-6 sm:p-8">
                <div>
                  <p className="text-sm font-extrabold tracking-[0.14em] text-[#8b7054]">ORDER ID</p>
                  <h2 className="mt-2 text-2xl font-extrabold text-black sm:text-3xl">{order.orderNumber}</h2>
                  <p className="mt-2 text-base text-[#625b53]">Placed {new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
                  {order.totalAmount !== undefined && <p className="mt-3 text-3xl font-extrabold text-[#218343]">{money(order.totalAmount)}</p>}
                </div>
                <div className="rounded-full bg-[#f3eee7] px-5 py-3 text-base font-extrabold text-black">{title(order.status)}</div>
              </div>
              <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
                <div>
                  <h3 className="mb-5 flex items-center gap-2 text-lg font-extrabold text-black"><PackageCheck size={21}/> Order progress</h3>
                  {cancelled ? (
                    <p className="rounded-xl bg-[#fff5f3] p-4 text-base font-bold text-[#a34d4d]">{order.status === "CANCELLED" ? "This order has been cancelled." : "This order has been refunded."}</p>
                  ) : (
                    <ol className="space-y-4">
                      {stages.map((stage, index) => {
                        const done = currentIndex >= index;
                        return <li key={stage} className="flex items-start gap-3">
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${done ? "border-[#a98b68] bg-[#a98b68] text-white" : "border-[#ded8cf] text-[#a9a095]"}`}>{done ? <CheckCircle2 size={18}/> : index + 1}</span>
                          <div><p className={`text-base font-bold ${done ? "text-black" : "text-[#888]"}`}>{title(stage)}</p><p className="mt-1 text-sm text-[#777]">{["Your order has been placed","Our team has received your order","Your order is being prepared","Your order is on its way","Your order has been delivered"][index]}</p></div>
                        </li>;
                      })}
                    </ol>
                  )}
                </div>
                <div className="rounded-xl bg-[#faf9f7] p-5">
                  <h3 className="flex items-center gap-2 text-lg font-extrabold text-black"><Truck size={21}/> Delivery details</h3>
                  <p className="mt-4 text-base font-semibold text-[#333]">Payment: {order.payment?.method === "COD" ? "Cash on Delivery" : order.payment?.method || "Not available"}</p>
                  {order.shipment?.carrier && <p className="mt-3 text-base text-[#555]">Courier: {order.shipment.carrier}</p>}
                  {order.shipment?.trackingNumber && <p className="mt-2 break-all text-base font-bold text-black">Tracking number: {order.shipment.trackingNumber}</p>}
                  {!order.shipment?.trackingNumber && <p className="mt-3 text-base leading-7 text-[#777]">Courier tracking details will appear here once your order has been dispatched.</p>}
                  <Link href="/account/orders" className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-black px-5 text-base font-bold text-black hover:bg-black hover:text-white">View full order bill</Link>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
