import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

export default function ContactPage() {
  return (
    <>
      <StorefrontHeader />
      <main className="flex min-h-[60vh] items-center justify-center bg-[#faf9f7] px-5 py-20 text-center text-[#171717]">
        <div className="max-w-xl">
          <p className="text-[10px] font-semibold tracking-[0.25em] text-[#a18c75]">WE ARE HERE TO HELP</p>
          <h1 className="mt-3 text-4xl font-semibold">Contact Us</h1>
          <p className="mt-4 text-sm leading-7 text-[#777]">Our contact details and support information will be added here soon.</p>
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
