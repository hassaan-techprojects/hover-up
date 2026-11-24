import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, PackageCheck } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  await connection();
  const { order } = await searchParams;

  return (
    <>
      <StorefrontHeader />
      <main className="flex min-h-[65vh] items-center justify-center bg-[#faf9f7] px-5 py-16 text-[#171717]">
        <section className="w-full max-w-xl rounded-3xl border border-[#e9e4dc] bg-white px-6 py-12 text-center shadow-[0_20px_70px_rgba(30,24,18,0.05)] sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3eee7] text-[#8c765e]">
            <CheckCircle2 size={34} strokeWidth={1.5} />
          </div>
          <p className="mt-6 text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">THANK YOU FOR SHOPPING WITH HOVER UP</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your order has been received.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#777]">We’ve received your order details. Our team will contact you to confirm the order and share the next updates.</p>
          {order && (
            <div className="mt-7 rounded-2xl bg-[#faf8f5] px-5 py-4">
              <p className="text-[10px] tracking-[0.15em] text-[#999]">YOUR ORDER NUMBER</p>
              <p className="mt-2 text-lg font-bold tracking-wide">{order}</p>
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#8b7864]"><PackageCheck size={15} /> Keep this order number for reference.</div>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/shop" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#171717] px-6 text-xs font-semibold tracking-wide text-white transition hover:bg-[#b99a76] hover:text-[#171717]">CONTINUE SHOPPING</Link>
            <Link href="/account/orders" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#e7e2da] px-6 text-xs font-semibold tracking-wide transition hover:border-[#b99a76]">VIEW MY ORDERS</Link>
          </div>
        </section>
      </main>
      <StorefrontFooter />
    </>
  );
}
