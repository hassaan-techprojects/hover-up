import Link from "next/link";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

export default function AboutPage() {
  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-white px-5 py-14 text-[#171717] sm:px-8 md:py-20">
        <article className="mx-auto max-w-4xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#987b5c]">WHO WE ARE</p>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight sm:text-5xl">About Hover Up</h1>
          <p className="mt-6 text-lg leading-8 text-[#5f5a54]">Hover Up helps people, teams and organisations bring their ideas to life through apparel. From everyday clothing to custom printed T-shirts, polos, hoodies, jerseys and caps, we make it easier to create clothing that carries your logo, artwork or message.</p>
          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-semibold">Made for individuals, teams and businesses</h2>
            <p className="text-base leading-8 text-[#666]">Whether you are preparing uniforms for your workplace, matching apparel for a college event, jerseys for a sports team, merchandise for your brand or a personal design, Hover Up gives you a simple way to choose apparel, select colours and sizes, and share your design requirements.</p>
            <p className="text-base leading-8 text-[#666]">You can upload your own artwork or share a text-based idea with your order. When a design needs to be prepared by our team, we share it with you for approval before production begins.</p>
          </section>
          <section className="mt-10 space-y-4">
            <h2 className="text-2xl font-semibold">Our approach</h2>
            <p className="text-base leading-8 text-[#666]">We focus on clear product information, practical pack-based ordering and helpful support throughout the order journey. Our aim is to make custom apparel straightforward for small requirements as well as larger group and bulk orders.</p>
          </section>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/shop" className="inline-flex min-h-12 items-center rounded-xl bg-[#171717] px-6 text-sm font-semibold text-white hover:bg-[#b99a76] hover:text-[#171717]">Explore the shop</Link>
            <Link href="/contact" className="inline-flex min-h-12 items-center rounded-xl border border-[#d9d1c7] px-6 text-sm font-semibold text-[#51483f]">Contact Hover Up</Link>
          </div>
        </article>
      </main>
      <StorefrontFooter />
    </>
  );
}
