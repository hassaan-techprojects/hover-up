"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type CartItem = {
  productId: string; name: string; slug: string; price: number; image: string; quantity: number;
  variantId?: string | null; variantName?: string | null; packSize?: number; color?: string;
  sizeBreakdown?: { size: string; quantity: number; variantId: string | null }[];
  frontImageUrl?: string; backImageUrl?: string; customizationNotes?: string;
};
const KEY = "hover-up-cart";
const BUY_NOW_KEY = "hover-up-buy-now";
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [checkoutSource, setCheckoutSource] = useState<"cart" | "buy-now">("cart");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", whatsapp: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", notes: "" });
  useEffect(() => {
    try {
      const buyNow = new URLSearchParams(window.location.search).get("mode") === "buy-now";
      setCheckoutSource(buyNow ? "buy-now" : "cart");
      const raw = localStorage.getItem(buyNow ? BUY_NOW_KEY : KEY);
      setItems(raw ? JSON.parse(raw) : []);
    } catch { setItems([]); }
    finally { setReady(true); }
  }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.price) * (item.packSize ? 1 : item.quantity), 0), [items]);
  const update = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!items.length) { setError("Your shopping bag is empty."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, paymentMethod: "COD", items }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to place your order.");
      localStorage.removeItem(checkoutSource === "buy-now" ? BUY_NOW_KEY : KEY);
      router.push("/order-confirmation?order=" + encodeURIComponent(data.order.orderNumber));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to place your order."); }
    finally { setBusy(false); }
  }

  const fields: { key: keyof typeof form; label: string; required?: boolean; type?: string; wide?: boolean }[] = [
    { key: "fullName", label: "Full name", required: true, wide: true },
    { key: "email", label: "Email address", required: true, type: "email" },
    { key: "phone", label: "Contact number", required: true, type: "tel" },
    { key: "whatsapp", label: "WhatsApp number", required: true, type: "tel" },
    { key: "addressLine1", label: "Address line 1", required: true, wide: true },
    { key: "addressLine2", label: "Landmark / apartment (optional)", wide: true },
    { key: "city", label: "City", required: true },
    { key: "state", label: "State", required: true },
    { key: "postalCode", label: "PIN code", required: true },
  ];

  return <><StorefrontHeader /><main className="min-h-[70vh] bg-[#faf9f7] px-5 py-10 text-[#171717] md:px-10 md:py-14"><div className="mx-auto max-w-[1180px]"><Link href="/cart" className="inline-flex items-center gap-2 text-xs text-[#766b60]"><ArrowLeft size={14}/> Back to bag</Link><div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
    <form onSubmit={submit} className="space-y-6"><section className="rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-7"><p className="text-[10px] tracking-[0.2em] text-[#a18c75]">DELIVERY DETAILS</p><h1 className="mt-2 text-2xl font-semibold">Checkout</h1><p className="mt-2 text-sm text-[#777]">Guest checkout is available. You do not need to create an account.</p><div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map(f => <label key={f.key} className={f.wide ? "sm:col-span-2" : ""}><span className="mb-2 block text-xs font-medium text-[#514b44]">{f.label}{f.required ? " *" : ""}</span><input required={f.required} type={f.type || "text"} value={form[f.key]} onChange={e => update(f.key, e.target.value)} className="h-12 w-full rounded-lg border border-[#e7e2da] px-3 text-sm outline-none focus:border-[#b99a76]"/></label>)}</div></section>
    <section className="rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-7"><p className="text-[10px] tracking-[0.2em] text-[#a18c75]">PAYMENT METHOD</p><h2 className="mt-2 text-lg font-semibold">Cash on Delivery</h2><div className="mt-4 rounded-xl border border-[#d9c7b1] bg-[#faf7f2] p-4"><p className="text-sm font-semibold">Pay when your order arrives</p><p className="mt-1 text-xs leading-5 text-[#777]">Online payment will be integrated later. No payment is collected now.</p></div><label className="mt-5 block"><span className="mb-2 block text-xs font-medium">Order notes (optional)</span><textarea rows={3} value={form.notes} onChange={e => update("notes", e.target.value)} className="w-full rounded-lg border border-[#e7e2da] px-3 py-3 text-sm outline-none focus:border-[#b99a76]" /></label></section>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy || !ready || !items.length} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-6 text-xs font-semibold tracking-[0.14em] text-white hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50"><LockKeyhole size={15}/>{busy ? "PLACING ORDER..." : "PLACE ORDER"}</button></form>
    <aside className="h-fit rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-6 lg:sticky lg:top-28"><h2 className="text-base font-semibold">Order summary</h2>{!ready ? <p className="mt-5 text-sm text-[#999]">Loading bag...</p> : items.length === 0 ? <p className="mt-5 text-sm text-[#999]">Your bag is empty. <Link href="/shop" className="underline">Browse products</Link>.</p> : <div className="mt-5 space-y-4">{items.map((item, i) => <div key={item.productId + i} className="flex gap-3"><div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f3f0eb]">{item.image && <img src={item.image} alt="" className="h-full w-full object-cover"/>}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-xs font-semibold">{item.name}</p><p className="mt-1 text-[11px] text-[#888]">{item.packSize ? "Pack of " + item.packSize : "Qty " + item.quantity}</p></div><p className="whitespace-nowrap text-xs font-semibold">{money(Number(item.price) * (item.packSize ? 1 : item.quantity))}</p></div>)}<div className="border-t border-[#eee9e2] pt-4"><div className="flex justify-between text-sm text-[#777]"><span>Subtotal</span><span>{money(total)}</span></div><div className="mt-3 flex justify-between text-base font-bold"><span>Total</span><span>{money(total)}</span></div></div></div>}</aside>
  </div></div></main><StorefrontFooter /></>;
}
