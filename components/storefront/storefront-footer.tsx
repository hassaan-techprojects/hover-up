"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUp, MapPin, Phone, Plus, Minus } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/919363254591?text=Hello%20Hover%20Up%2C%20I%20need%20assistance%20with%20my%20order.";

function FacebookMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor"><path d="M13.5 21v-8.2h2.8l.42-3.2H13.5V7.56c0-.93.26-1.56 1.6-1.56h1.7V3.14C16.5 3.05 15.48 3 14.3 3c-2.48 0-4.18 1.51-4.18 4.29V9.6H7.3v3.2h2.82V21h3.38Z"/></svg>;
}

function InstagramMark() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.6" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>;
}

function WhatsAppMark({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 32 32" aria-hidden="true" width={size} height={size} fill="none"><path fill="currentColor" d="M16 3.2A12.5 12.5 0 0 0 5.2 22.1L3.5 28.5l6.6-1.7A12.5 12.5 0 1 0 16 3.2Z"/><path fill="#25D366" d="M16 5.5a10.2 10.2 0 0 0-8.7 15.5l.4.6-1 3.6 3.7-1 .6.3A10.2 10.2 0 1 0 16 5.5Z"/><path fill="#fff" d="M21.7 18.7c-.3-.2-1.8-.9-2.1-1s-.5-.2-.7.2-.8 1-.9 1.1-.3.2-.6.1a8.4 8.4 0 0 1-2.5-1.5 9.4 9.4 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.6l.5-.6.3-.5c.1-.2 0-.4 0-.6l-.9-2.1c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.4s-1.2 1.2-1.2 2.8 1.2 3.2 1.4 3.4c.2.2 2.4 3.7 5.8 5 .8.3 1.4.5 1.9.6.8.2 1.5.2 2 .1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4Z"/></svg>;
}

function Accordion({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/15 py-4">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between text-left text-base font-semibold text-white">
        {title}
        {open ? <Minus size={19}/> : <Plus size={19}/>}
      </button>
      {open && <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-5 text-sm leading-6 text-white/70">{children}</div>}
    </section>
  );
}

export default function StorefrontFooter() {
  const [quickOpen, setQuickOpen] = useState(false);
  const [importantOpen, setImportantOpen] = useState(false);

  return (
    <>
      <footer className="bg-[#111111] px-5 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-10 text-white sm:px-8 md:px-10 md:pb-8 md:pt-14">
        <div className="mx-auto grid max-w-[1440px] gap-8 lg:grid-cols-[1.2fr_0.85fr_0.95fr] lg:gap-14">
          <section>
            <Link href="/" aria-label="Hover Up home" className="inline-flex items-center gap-3">
              <img src="/hu.png" alt="Hover Up logo" className="h-16 w-auto max-w-[110px] object-contain sm:h-[72px]" />
              <span className="whitespace-nowrap text-2xl font-black tracking-tight sm:text-3xl">HOVER UP<span className="text-[#b99a76]">.</span></span>
            </Link>
            <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-white/85 sm:text-xl sm:leading-9">
              Discover thoughtfully selected styles, everyday essentials and statement pieces. Shop the latest collections at Hover Up.
            </p>
            <div className="mt-6 flex items-center gap-3" aria-label="Social media">
              <span title="Facebook" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white"><FacebookMark/></span>
              <a href="https://www.instagram.com/hoverup.in/" target="_blank" rel="noopener noreferrer" aria-label="Hover Up on Instagram" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition hover:border-[#b99a76] hover:text-[#d4b998]"><InstagramMark/></a>
            </div>
          </section>

          <section className="lg:pt-2">
            <div className="lg:hidden">
              <Accordion title="Quick Links" open={quickOpen} onToggle={() => setQuickOpen(!quickOpen)}>
                <Link href="/">Home</Link>
                <Link href="/shop">Shop</Link>
                <Link href="/contact">Contact</Link>
                <Link href="/categories">Categories</Link>
              </Accordion>
              <Accordion title="Important Links" open={importantOpen} onToggle={() => setImportantOpen(!importantOpen)}>
                <Link href="/contact">Contact Us</Link>
                <Link href="/about">About Us</Link>
                <Link href="/policies/privacy">Privacy Policy</Link>
                <Link href="/policies/terms">Terms &amp; Conditions</Link>
                <Link href="/policies/returns">Returns &amp; Refund</Link>
                <Link href="/policies/shipping">Shipping Policy</Link>
              </Accordion>
            </div>
            <div className="hidden grid-cols-2 gap-8 lg:grid">
              <div>
                <h3 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-[#d4b998]">Quick Links</h3>
                <div className="flex flex-col gap-3 text-sm text-white/70">
                  <Link href="/" className="hover:text-white">Home</Link><Link href="/shop" className="hover:text-white">Shop</Link><Link href="/contact" className="hover:text-white">Contact</Link><Link href="/categories" className="hover:text-white">Categories</Link>
                </div>
              </div>
              <div>
                <h3 className="mb-5 text-sm font-bold uppercase tracking-[0.16em] text-[#d4b998]">Important Links</h3>
                <div className="flex flex-col gap-3 text-sm text-white/70">
                  <Link href="/contact" className="hover:text-white">Contact Us</Link><Link href="/about" className="hover:text-white">About Us</Link><Link href="/policies/privacy" className="hover:text-white">Privacy Policy</Link><Link href="/policies/terms" className="hover:text-white">Terms &amp; Conditions</Link><Link href="/policies/returns" className="hover:text-white">Returns &amp; Refund</Link><Link href="/policies/shipping" className="hover:text-white">Shipping Policy</Link>
                </div>
              </div>
            </div>
          </section>

          <section className="lg:pt-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-[#d4b998]">Contact Information</h3>
            <div className="mt-5 space-y-4 text-base leading-7 text-white/75">
              <p className="flex items-start gap-3"><Phone size={19} className="mt-1 shrink-0 text-[#d4b998]"/><a href="tel:+919363254591" className="hover:text-white">+91 93632 54591</a></p>
              <p className="flex items-start gap-3"><MapPin size={19} className="mt-1 shrink-0 text-[#d4b998]"/><span>Masjid St, Noorullahpet, Muslimpur, Basheerabad, Vaniyambadi, Tamil Nadu 635751, India</span></p>
            </div>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with Hover Up on WhatsApp" className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-full border border-white/30 bg-[#292929] px-5 text-sm font-semibold text-white transition hover:bg-[#3a3a3a]">
              <WhatsAppMark size={23}/> Chat on WhatsApp
            </a>
          </section>
        </div>

        <div className="mx-auto mt-9 max-w-[1440px] border-t border-white/10 pt-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Secure and flexible payments</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <img src="/brands/cod.png" alt="Cash on Delivery" loading="lazy" className="h-10 w-auto max-w-[132px] rounded-md bg-white object-contain p-1.5"/>
                <img src="/brands/razorpay.png" alt="Razorpay" loading="lazy" className="h-10 w-auto max-w-[132px] rounded-md bg-white object-contain p-1.5"/>
              </div>
            </div>
            <button type="button" onClick={() => window.scrollTo({top:0,behavior:"smooth"})} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-sm bg-white px-6 text-sm font-bold text-[#111] transition hover:bg-[#d4b998]">
              <ArrowUp size={18}/> Go to top
            </button>
          </div>
          <p className="mt-6 text-xs text-white/45">© 2026 Hover Up. All rights reserved.</p>
        </div>
      </footer>

      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="Chat with Hover Up on WhatsApp" title="Chat with Hover Up on WhatsApp" className="fixed bottom-20 right-5 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_30px_rgba(0,0,0,0.22)] transition hover:scale-105 md:bottom-5">
        <WhatsAppMark size={34}/>
      </a>
    </>
  );
}
