"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, MapPin, PackageCheck, ShieldCheck } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type CartItem = {
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  variantName: string | null;
  packSize?: number;
  color?: string;
  sizeBreakdown?: { size: string; quantity: number; variantId: string | null }[];
  frontImageUrl?: string;
  backImageUrl?: string;
  customizationNotes?: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CART_STORAGE_KEY = "hover-up-cart";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      setItems(stored ? JSON.parse(stored) as CartItem[] : []);
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => setRazorpayReady(false);
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * (item.packSize ? 1 : item.quantity), 0),
    [items]
  );

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) {
      setMessage("Your shopping bag is empty.");
      return;
    }
    if (paymentMethod === "ONLINE" && !razorpayReady) {
      setMessage("Online payment is still loading. Please wait a moment and try again.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { firstName, lastName, email, phone, whatsappPhone },
          address: {
            fullName: [firstName, lastName].filter(Boolean).join(" "),
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country: "India",
          },
          items,
          paymentMethod,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to place your order.");

      if (paymentMethod === "COD") {
        localStorage.removeItem(CART_STORAGE_KEY);
        router.push(`/order-success?order=${encodeURIComponent(data.order.orderNumber)}`);
        return;
      }

      if (!data.payment?.keyId || !data.payment?.orderId || !window.Razorpay) {
        throw new Error("The online payment session could not be started.");
      }

      const checkout = new window.Razorpay({
        key: data.payment.keyId,
        amount: data.payment.amount,
        currency: data.payment.currency,
        name: "Hover Up",
        description: `Order ${data.order.orderNumber}`,
        order_id: data.payment.orderId,
        prefill: { name: [firstName, lastName].filter(Boolean).join(" "), email, contact: phone },
        notes: { orderNumber: data.order.orderNumber },
        theme: { color: "#b99a76" },
        handler: async (paymentResponse: Record<string, string>) => {
          const verifyResponse = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: data.order.id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            }),
          });
          const verified = await verifyResponse.json();
          if (!verifyResponse.ok) {
            setMessage(verified.error || "Payment verification failed. Please contact the store with your order number.");
            setSubmitting(false);
            return;
          }
          localStorage.removeItem(CART_STORAGE_KEY);
          router.push(`/order-success?order=${encodeURIComponent(data.order.orderNumber)}`);
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setMessage("Payment was not completed. Your order remains pending; you can retry or contact the store.");
          },
        },
      });
      checkout.open();
      setSubmitting(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  const fieldClass = "mt-2 w-full rounded-xl border border-[#e7e2da] bg-white px-4 py-3 text-sm text-[#171717] outline-none transition placeholder:text-[#aaa] focus:border-[#b99a76] focus:ring-2 focus:ring-[#b99a76]/15";

  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[70vh] bg-[#faf9f7] px-5 py-10 text-[#171717] md:px-10 md:py-14">
        <div className="mx-auto max-w-[1180px]">
          <Link href="/cart" className="inline-flex items-center gap-2 text-xs text-[#82766a] transition hover:text-black"><ArrowLeft size={14} /> BACK TO BAG</Link>
          <div className="mt-5 grid gap-7 lg:grid-cols-[1fr_370px]">
            <form onSubmit={placeOrder} className="space-y-6">
              <section className="rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#f5f1eb] p-2.5 text-[#92785e]"><MapPin size={18} /></div>
                  <div><h1 className="text-xl font-semibold">Delivery details</h1><p className="mt-1 text-xs text-[#888]">Guest checkout is available. No account is required.</p></div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-medium text-[#5f574e]">First name *<input required autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} className={fieldClass} placeholder="First name" /></label>
                  <label className="text-xs font-medium text-[#5f574e]">Last name<input autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} className={fieldClass} placeholder="Last name" /></label>
                  <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Email address *<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={fieldClass} placeholder="you@example.com" /></label>
                  <label className="text-xs font-medium text-[#5f574e]">Contact number *<input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className={fieldClass} placeholder="+91 98765 43210" /></label>
                  <label className="text-xs font-medium text-[#5f574e]">WhatsApp number<input type="tel" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} className={fieldClass} placeholder="Same as contact number if blank" /></label>
                  <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Address line 1 *<input required autoComplete="address-line1" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className={fieldClass} placeholder="House / flat, street, area" /></label>
                  <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Address line 2<input autoComplete="address-line2" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} className={fieldClass} placeholder="Landmark (optional)" /></label>
                  <label className="text-xs font-medium text-[#5f574e]">City *<input required autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} className={fieldClass} placeholder="City" /></label>
                  <label className="text-xs font-medium text-[#5f574e]">State *<input required autoComplete="address-level1" value={state} onChange={e => setState(e.target.value)} className={fieldClass} placeholder="State" /></label>
                  <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">PIN code *<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" value={postalCode} onChange={e => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className={fieldClass} placeholder="6-digit PIN code" /></label>
                </div>
              </section>

              <section className="rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-7">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-[#f5f1eb] p-2.5 text-[#92785e]"><LockKeyhole size={18} /></div><div><h2 className="text-lg font-semibold">Payment method</h2><p className="mt-1 text-xs text-[#888]">Choose how you would like to pay.</p></div></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setPaymentMethod("COD")} className={`rounded-xl border p-4 text-left transition ${paymentMethod === "COD" ? "border-[#b99a76] bg-[#faf6f0] ring-2 ring-[#b99a76]/15" : "border-[#e8e3dc] hover:border-[#c9b9a5]"}`}>
                    <span className="block text-sm font-semibold">Cash on Delivery</span><span className="mt-1 block text-xs text-[#888]">Pay when your order arrives</span>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod("ONLINE")} className={`rounded-xl border p-4 text-left transition ${paymentMethod === "ONLINE" ? "border-[#b99a76] bg-[#faf6f0] ring-2 ring-[#b99a76]/15" : "border-[#e8e3dc] hover:border-[#c9b9a5]"}`}>
                    <span className="block text-sm font-semibold">Pay Online</span><span className="mt-1 block text-xs text-[#888]">UPI, cards and net banking via Razorpay</span>
                  </button>
                </div>
              </section>

              {message && <p role="alert" className="rounded-xl border border-[#e7d4c5] bg-[#fff9f3] px-4 py-3 text-sm text-[#8b5636]">{message}</p>}
              <button type="submit" disabled={submitting || !loaded || items.length === 0} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#171717] px-6 text-xs font-semibold tracking-[0.14em] text-white transition hover:bg-[#b99a76] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? "PROCESSING..." : paymentMethod === "COD" ? "PLACE ORDER" : "PAY NOW"} <ArrowRight size={16} />
              </button>
              <p className="text-center text-[10px] text-[#999]">By placing your order, you agree to be contacted about order confirmation and delivery.</p>
            </form>

            <aside className="h-fit rounded-2xl border border-[#e9e4dc] bg-white p-5 sm:p-6 lg:sticky lg:top-28">
              <h2 className="text-base font-semibold">Your order</h2>
              {!loaded ? <p className="mt-5 text-sm text-[#999]">Loading bag...</p> : items.length === 0 ? <p className="mt-5 text-sm text-[#888]">Your bag is empty. <Link href="/shop" className="underline">Continue shopping</Link></p> : (
                <>
                  <div className="mt-5 space-y-4">
                    {items.map((item, index) => (
                      <div key={`${item.productId}-${index}`} className="flex gap-3">
                        <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f2f0ec]">{item.image && <img src={item.image} alt={item.name} className="h-full w-full object-cover" />}</div>
                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold leading-5">{item.name}</p><p className="mt-1 text-[10px] text-[#888]">{item.packSize ? `Pack of ${item.packSize}` : `Qty ${item.quantity}`}</p></div>
                        <p className="text-xs font-semibold">{formatPrice(Number(item.price))}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-[#eee9e2] pt-4 text-sm"><span className="text-[#777]">Subtotal</span><span className="font-semibold">{formatPrice(total)}</span></div>
                  <div className="mt-3 flex items-center justify-between text-base"><span className="font-semibold">Total</span><span className="font-bold">{formatPrice(total)}</span></div>
                  <p className="mt-3 text-[10px] leading-5 text-[#999]">Shipping charges, if applicable, will be confirmed before dispatch.</p>
                </>
              )}
              <div className="mt-6 space-y-3 border-t border-[#eee9e2] pt-5 text-[11px] text-[#888]">
                <div className="flex items-center gap-2"><ShieldCheck size={15} className="text-[#a18c75]" /> Secure order processing</div>
                <div className="flex items-center gap-2"><PackageCheck size={15} className="text-[#a18c75]" /> Order updates by email and WhatsApp</div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
