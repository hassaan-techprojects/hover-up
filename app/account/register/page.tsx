"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

export default function AccountRegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          phone: phone.trim(),
          password,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to create your account.");

      const login = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (login?.error) {
        router.replace("/account/login?created=1");
        return;
      }

      router.replace("/account/orders");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const field = "mt-2 w-full rounded-xl border border-[#e7e2da] px-4 py-3 text-sm outline-none focus:border-[#b99a76] focus:ring-2 focus:ring-[#b99a76]/15";

  return (
    <>
      <StorefrontHeader />
      <main className="flex min-h-[65vh] items-center justify-center bg-[#faf9f7] px-5 py-14">
        <form onSubmit={register} className="w-full max-w-lg rounded-3xl border border-[#e9e4dc] bg-white p-6 shadow-[0_20px_70px_rgba(30,24,18,0.05)] sm:p-9">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">HOVER UP ACCOUNT</p>
          <h1 className="mt-3 text-3xl font-semibold">Create your account</h1>
          <p className="mt-2 text-sm text-[#888]">Create an account to manage your orders and connect any guest orders placed with this email.</p>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium text-[#5f574e]">First name *<input required autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} className={field} /></label>
            <label className="text-xs font-medium text-[#5f574e]">Last name<input autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} className={field} /></label>
            <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Email address *<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={field} /></label>
            <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Contact number *<input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className={field} /></label>
            <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Password *
              <div className="relative">
                <input required type={showPassword ? "text" : "password"} minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className={`${field} pr-12`} />
                <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#777]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <span className="mt-1 block text-[10px] font-normal text-[#999]">Use at least 8 characters.</span>
            </label>
          </div>

          {error && <p role="alert" className="mt-4 text-xs text-[#a14d3d]">{error}</p>}

          <button disabled={loading} className="mt-6 min-h-12 w-full rounded-xl bg-[#171717] text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50">
            {loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
          </button>

          <p className="mt-6 text-center text-xs text-[#888]">Already have an account? <Link href="/account/login" className="font-semibold text-[#8b7054] underline">Sign in</Link></p>
        </form>
      </main>
      <StorefrontFooter />
    </>
  );
}
