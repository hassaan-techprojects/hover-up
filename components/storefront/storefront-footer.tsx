"use client";

import Link from "next/link";
import { ArrowUp, MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/919363254591?text=Hello%20Hover%20Up%2C%20I%20need%20assistance%20with%20my%20order.";

function FacebookMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px]" fill="currentColor"><path d="M13.5 21v-8.2h2.8l.42-3.2H13.5V7.56c0-.93.26-1.56 1.6-1.56h1.7V3.14C16.5 3.05 15.48 3 14.3 3c-2.48 0-4.18 1.51-4.18 4.29V9.6H7.3v3.2h2.82V21h3.38Z"/></svg>;
}

function InstagramMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>;
}

export default function StorefrontFooter() {
  return (
    <>
      <footer className="border-t border-[#e8e3dc] bg-[#111111] px-5 pb-7 pt-12 text-white sm:px-8 md:px-10 md:pt-16">
        <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[1.35fr_0.75fr_0.8fr] lg:gap-16">
          <section>
            <Link href="/" aria-label="Hover Up home" className="inline-flex items-center gap-2">
              <img src="/hu.png" alt="" className="h-10 w-auto object-contain brightness-0 invert" />
              <span className="text-2xl font-extrabold tracking-[-0.07em]">HOVER UP</span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/65">
              Discover thoughtfully selected styles, everyday essentials and statement pieces. Shop the latest collection at Hover Up.
            </p>
            <div className="mt-6 flex items-center gap-3" aria-label="Social media">
              <span title="Facebook profile will be added soon" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-[#b99a76] hover:text-[#d4b998]"><FacebookMark /></span>
              <span title="Instagram profile will be added soon" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-[#b99a76] hover:text-[#d4b998]"><InstagramMark /></span>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d4b998]">Explore</h3>
            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 text-sm text-white/65">
              <Link className="transition hover:text-white" href="/shop">Shop all</Link>
              <Link className="transition hover:text-white" href="/categories">Categories</Link>
              <Link className="transition hover:text-white" href="/collections">Collections</Link>
              <Link className="transition hover:text-white" href="/about">About us</Link>
              <Link className="transition hover:text-white" href="/contact">Contact</Link>
              <Link className="transition hover:text-white" href="/faq">FAQs</Link>
              <Link className="transition hover:text-white" href="/policies/shipping">Shipping policy</Link>
              <Link className="transition hover:text-white" href="/policies/returns">Returns</Link>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d4b998]">Contact information</h3>
            <div className="mt-5 space-y-4 text-sm text-white/70">
              <p className="flex items-start gap-3"><Phone size={16} className="mt-0.5 shrink-0 text-[#d4b998]"/> <a href="tel:+919363254591" className="transition hover:text-white">+91 93632 54591</a></p>
              <p className="flex items-start gap-3"><Mail size={16} className="mt-0.5 shrink-0 text-[#d4b998]"/> <span>Contact details will be updated soon</span></p>
              <p className="flex items-start gap-3"><Clock size={16} className="mt-0.5 shrink-0 text-[#d4b998]"/> <span>Customer support: 24/7</span></p>
              <p className="flex items-start gap-3"><MapPin size={16} className="mt-0.5 shrink-0 text-[#d4b998]"/> <span>Masjid St, Noorullahpet, Muslimpur, Basheerabad, Vaniyambadi, Tamil Nadu 635751</span></p>
            </div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with Hover Up on WhatsApp" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#25D366] px-5 text-xs font-bold text-white shadow-lg transition hover:bg-[#1fb95a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#25D366]">
              <MessageCircle size={17}/> Chat on WhatsApp
            </a>
          </section>
        </div>

        <div className="mx-auto mt-12 max-w-[1440px] border-t border-white/15 pt-6">
          <nav aria-label="Legal links" className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-white/55">
            <Link href="/about" className="hover:text-white">About us</Link>
            <Link href="/policies/returns" className="hover:text-white">Return policy</Link>
            <Link href="/policies/terms" className="hover:text-white">Terms &amp; conditions</Link>
            <Link href="/policies/privacy" className="hover:text-white">Privacy policy</Link>
            <Link href="/policies/shipping" className="hover:text-white">Shipping policy</Link>
          </nav>

          <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">Secure and flexible payments</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <img src="/brands/cod.png" alt="Cash on Delivery" loading="lazy" className="h-10 w-auto max-w-[132px] rounded-md bg-white object-contain p-1.5" /><img src="/brands/razorpay.png" alt="Razorpay" loading="lazy" className="h-10 w-auto max-w-[132px] rounded-md bg-white object-contain p-1.5" />
              </div>
            </div>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 rounded-sm bg-white px-7 text-xs font-bold uppercase tracking-[0.12em] text-[#111] shadow-sm transition hover:bg-[#d4b998] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d4b998]">
              <ArrowUp size={17}/> Go to top
            </button>
          </div>
          <p className="mt-7 text-[11px] text-white/40">© 2026 Hover Up. All rights reserved.</p>
        </div>
      </footer>

      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with Hover Up on WhatsApp" title="Chat with Hover Up on WhatsApp" className="fixed bottom-20 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full md:bottom-5" bg-[#25D366] text-white shadow-[0_8px_30px_rgba(0,0,0,0.22)] transition hover:scale-105 hover:bg-[#1fb95a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#25D366]">
        <MessageCircle size={27} strokeWidth={2.2}/>
      </a>
    </>
  );
}
