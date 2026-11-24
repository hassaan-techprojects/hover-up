"use client";

import { type FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

export default function AccountLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("The email or password is incorrect.");
      return;
    }
    const session = await getSession();
    const role = session?.user?.role;

    router.replace(role === "ADMIN" || role === "ANALYST" ? "/dashboard" : "/account/orders");
    router.refresh();
  }

  const field = "mt-2 w-full rounded-xl border border-[#e7e2da] px-4 py-3 text-sm outline-none focus:border-[#b99a76] focus:ring-2 focus:ring-[#b99a76]/15";

  return (
    <>
      <StorefrontHeader />
      <main className="flex min-h-[65vh] items-center justify-center bg-[#faf9f7] px-5 py-14">
        <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-[#e9e4dc] bg-white p-6 shadow-[0_20px_70px_rgba(30,24,18,0.05)] sm:p-9">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">HOVER UP ACCOUNT</p>
          <h1 className="mt-3 text-3xl font-semibold">Welcome back</h1>
          <p className="mt-2 text-sm text-[#888]">Sign in to see your orders and account details.</p>
          <label className="mt-7 block text-xs font-medium text-[#5f574e]">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className={field} /></label>
          <label className="mt-4 block text-xs font-medium text-[#5f574e]">Password<div className="relative"><input required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className={`${field} pr-12`} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#777] hover:text-[#171717]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <div className="mt-2 text-right"><Link href="/account/forgot-password" className="text-xs font-medium text-[#8b7054] underline">Forgot password?</Link></div>
          {error && <p role="alert" className="mt-4 text-xs text-[#a14d3d]">{error}</p>}
          <button disabled={loading} className="mt-6 min-h-12 w-full rounded-xl bg-[#171717] text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50">{loading ? "SIGNING IN..." : "SIGN IN"}</button>
          <p className="mt-6 text-center text-xs text-[#888]">New to Hover Up? <Link href="/account/register" className="font-semibold text-[#8b7054] underline">Create an account</Link></p>
          <p className="mt-3 text-center text-xs text-[#888]"><Link href="/account/orders" className="underline">Track a guest order</Link></p>
        </form>
      </main>
      <StorefrontFooter />
    </>
  );
}
