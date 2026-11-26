"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, UserRound } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type CustomerProfile = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/account/orders", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        if (response.ok && data.customer) {
          setSignedIn(true);
          setProfile(data.customer);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Customer";

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const result = await signOut({ callbackUrl: "/account", redirect: false });
      if (!result?.url) {
        throw new Error("The sign-out request did not complete.");
      }

      setSignedIn(false);
      setProfile(null);
      router.replace("/account");
      router.refresh();
    } catch {
      setLoggingOut(false);
      setLogoutError("Unable to log out. Please try again.");
    }
  }

  return (
    <>
      <StorefrontHeader />
      <main className="min-h-[65vh] bg-[#faf9f7] px-5 py-12 text-[#171717] md:px-10 md:py-16">
        <div className="mx-auto max-w-[1050px]">
          <p className="text-sm font-semibold tracking-[0.14em] text-[#8b7054]">YOUR HOVER UP ACCOUNT</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">My Account</h1>
          <p className="mt-2 text-base text-[#777]">Manage your personal details and access your order history.</p>

          <nav aria-label="Customer account" className="mt-7 flex flex-wrap gap-2 border-b border-[#e7e1d8] pb-3">
            <Link href="/account" aria-current="page" className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white">Account</Link>
            <Link href="/account/orders" className="rounded-xl border border-[#e8e3dc] bg-white px-5 py-3 text-base font-bold text-[#5f574e] transition hover:border-[#b99a76] hover:text-[#5d4936]">My Orders</Link>
            <Link href="/account/track-order" className="rounded-xl border border-[#e8e3dc] bg-white px-5 py-3 text-base font-bold text-[#5f574e] transition hover:border-[#b99a76] hover:text-[#5d4936]">Track Order</Link>
          </nav>

          {loading ? (
            <div className="mt-8 h-56 animate-pulse rounded-2xl bg-[#efede9]" />
          ) : signedIn ? (
            <section className="mt-8 max-w-2xl rounded-2xl border border-[#e9e4dc] bg-white p-6 sm:p-8">
              <div className="flex items-center gap-4 border-b border-[#eee9e2] pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eee7de] text-[#70583f]"><UserRound size={25} /></div>
                <div><h2 className="text-xl font-semibold">{fullName}</h2><p className="mt-1 text-sm text-[#777]">Customer account</p></div>
              </div>
              <dl className="grid gap-5 py-6 sm:grid-cols-2">
                <div><dt className="text-sm font-medium text-[#8b8176]">Full name</dt><dd className="mt-1 text-base font-semibold">{fullName}</dd></div>
                <div><dt className="text-sm font-medium text-[#8b8176]">Email address</dt><dd className="mt-1 break-all text-base font-semibold">{profile?.email || "Not provided"}</dd></div>
                <div><dt className="text-sm font-medium text-[#8b8176]">Contact number</dt><dd className="mt-1 text-base font-semibold">{profile?.phone || "Not provided"}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-3 border-t border-[#eee9e2] pt-6">
                <Link href="/account/orders" className="inline-flex min-h-12 items-center rounded-xl bg-[#171717] px-5 text-base font-bold text-white transition hover:bg-[#b99a76] hover:text-[#171717]">My Orders</Link>
                <Link href="/account/track-order" className="inline-flex min-h-12 items-center rounded-xl border border-[#e5ded4] px-5 text-base font-bold text-[#5f574e] transition hover:border-[#b99a76] hover:bg-[#f8f6f2]">Track Order</Link>
                <button type="button" onClick={handleLogout} disabled={loggingOut} aria-busy={loggingOut} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#e5ded4] px-5 text-sm font-semibold text-[#5f574e] transition hover:border-[#b99a76] hover:bg-[#f8f6f2] disabled:cursor-not-allowed disabled:opacity-60"><LogOut size={17} /> {loggingOut ? "Logging out..." : "Log out"}</button>
              </div>
              {logoutError && <p role="alert" className="mt-4 text-sm text-red-600">{logoutError}</p>}
            </section>
          ) : (
            <section className="mt-8 max-w-2xl rounded-2xl border border-[#e9e4dc] bg-white p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Sign in to your account</h2>
              <p className="mt-2 text-base leading-7 text-[#777]">Sign in to view your personal details and manage your Hover Up orders.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/account/login" className="inline-flex min-h-12 items-center rounded-xl bg-[#171717] px-5 text-sm font-semibold text-white">Sign in</Link>
                <Link href="/account/register" className="inline-flex min-h-12 items-center rounded-xl border border-[#e5ded4] px-5 text-sm font-semibold text-[#5f574e]">Create account</Link>
              </div>
            </section>
          )}
        </div>
      </main>
      <StorefrontFooter />
    </>
  );
}
