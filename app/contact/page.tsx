import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";
import { MapPin, Phone, MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/919363254591?text=Hello%20Hover%20Up%2C%20I%20need%20assistance.";

export default function ContactPage() {
  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-[#faf9f7] px-5 py-14 text-[#171717] sm:px-8 md:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#987b5c]">WE ARE HERE TO HELP</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">Contact Us</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#666]">Have a question about a product, custom design, pack quantity, an existing order or delivery? Contact the Hover Up team using the details below.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-[#e9e4dc] bg-white p-6 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eee7de] text-[#765238]"><Phone size={22}/></div>
              <h2 className="mt-5 text-xl font-semibold">Call us</h2>
              <p className="mt-2 text-base leading-7 text-[#777]">Speak with us about your order or product requirements.</p>
              <a href="tel:+919363254591" className="mt-4 inline-block text-lg font-semibold text-[#765238]">+91 93632 54591</a>
            </section>
            <section className="rounded-2xl border border-[#e9e4dc] bg-white p-6 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eee7de] text-[#765238]"><MessageCircle size={22}/></div>
              <h2 className="mt-5 text-xl font-semibold">Chat on WhatsApp</h2>
              <p className="mt-2 text-base leading-7 text-[#777]">Message us with your question or order details.</p>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#292929] px-5 text-sm font-semibold text-white hover:bg-[#444]">Chat on WhatsApp</a>
            </section>
            <section className="rounded-2xl border border-[#e9e4dc] bg-white p-6 sm:p-8 md:col-span-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eee7de] text-[#765238]"><MapPin size={22}/></div>
              <h2 className="mt-5 text-xl font-semibold">Our address</h2>
              <p className="mt-2 max-w-xl text-base leading-7 text-[#777]">Masjid St, Noorullahpet, Muslimpur, Basheerabad, Vaniyambadi, Tamil Nadu 635751, India</p>
            </section>
          </div>
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
