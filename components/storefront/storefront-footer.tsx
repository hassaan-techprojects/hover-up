"use client";

import Link from "next/link";
import { ArrowUp, Facebook, Instagram, MessageCircle } from "lucide-react";

export default function StorefrontFooter() {
  return (
    <>
      <footer className="bg-[#111111] px-6 py-14 text-white md:px-10">
        <div className="mx-auto grid max-w-[1500px] gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <h2 className="text-3xl font-black tracking-tighter">HOVER UP.</h2>
            <p className="mt-4 max-w-xs text-sm leading-6 text-neutral-400">
              Your style. Your statement. Discover Hover Up.
            </p>
            <div className="mt-6 flex items-center gap-3" aria-label="Social media">
              <span title="Facebook link will be added soon" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80"><Facebook size={17} /></span>
              <span title="Instagram link will be added soon" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80"><Instagram size={17} /></span>
              <span title="WhatsApp contact will be added soon" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80"><MessageCircle size={17} /></span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold tracking-widest">SHOP</h3>
            <div className="mt-5 space-y-3 text-sm font-medium text-neutral-400">
              <p><Link className="transition hover:text-white" href="/shop">All Products</Link></p>
              <p><Link className="transition hover:text-white" href="/categories">Categories</Link></p>
              <p><Link className="transition hover:text-white" href="/wishlist">Wishlist</Link></p>
              <p><Link className="transition hover:text-white" href="/collections">Collections</Link></p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold tracking-widest">CUSTOMER CARE</h3>
            <div className="mt-5 space-y-3 text-sm font-medium text-neutral-400">
              <p><Link className="transition hover:text-white" href="/contact">Contact Us</Link></p>
              <p><Link className="transition hover:text-white" href="/faq">FAQs</Link></p>
              <p><Link className="transition hover:text-white" href="/policies/shipping">Shipping Policy</Link></p>
              <p><Link className="transition hover:text-white" href="/policies/returns">Returns</Link></p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-extrabold tracking-widest">ACCOUNT</h3>
            <div className="mt-5 space-y-3 text-sm font-medium text-neutral-400">
              <p><Link className="transition hover:text-white" href="/account">My Account</Link></p>
              <p><Link className="transition hover:text-white" href="/account/orders">My Orders</Link></p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-[1500px] border-t border-white/15 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-neutral-500">© 2026 Hover Up. All rights reserved.</span>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-flex min-h-10 items-center justify-center gap-2 self-start border border-white/25 px-4 text-[10px] font-semibold tracking-[0.12em] text-white transition hover:border-[#b99a76] hover:text-[#b99a76] sm:self-auto">GO TO TOP <ArrowUp size={14} /></button>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-white/10 pt-5" aria-label="Available payment methods">
            <span className="mr-2 text-[10px] font-semibold tracking-[0.14em] text-neutral-500">PAYMENT METHODS</span>
            {["Cash on Delivery", "Razorpay", "UPI", "Google Pay", "PhonePe", "Visa", "Mastercard"].map((method) => (
              <span key={method} className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-semibold text-neutral-300">{method}</span>
            ))}
          </div>
        </div>
      </footer>

      <button
        type="button"
        disabled
        aria-label="WhatsApp support coming soon"
        title="WhatsApp contact will be added soon"
        className="fixed bottom-5 right-5 z-[80] flex h-14 w-14 cursor-not-allowed items-center justify-center rounded-full bg-[#25D366] text-white opacity-90 shadow-[0_8px_30px_rgba(0,0,0,0.22)]"
      >
        <MessageCircle size={27} strokeWidth={2.2} />
      </button>
    </>
  );
}
