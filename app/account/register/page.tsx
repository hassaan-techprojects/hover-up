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
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"details" | "verify" | "success">("details");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/account/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to send the verification code.");
      setStage("verify");
      setNotice(`A verification OTP has been sent to ${email.trim().toLowerCase()}. Enter the code to create your account.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to send the verification code."); }
    finally { setLoading(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch("/api/account/register/verify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to verify your email.");
      const login = await signIn("credentials", { email: normalizedEmail, password, redirect: false });
      if (login?.error) { router.replace("/account/login?created=1"); return; }
      setStage("success");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to verify your email."); }
    finally { setLoading(false); }
  }

  const field = "mt-2 w-full rounded-xl border border-[#e7e2da] px-4 py-3 text-sm outline-none focus:border-[#b99a76] focus:ring-2 focus:ring-[#b99a76]/15";
  return (
    <>
      <StorefrontHeader />
      <main className="flex min-h-[65vh] items-center justify-center bg-[#faf9f7] px-5 py-14">
        {stage === "success" ? (
          <section className="w-full max-w-lg rounded-3xl border border-[#e9e4dc] bg-white p-8 text-center shadow-[0_20px_70px_rgba(30,24,18,0.05)] sm:p-10">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">HOVER UP ACCOUNT</p>
            <h1 className="mt-4 text-3xl font-semibold">Account successfully created</h1>
            <p className="mt-3 text-sm text-[#888]">Your email has been verified and your account is ready.</p>
            <button type="button" onClick={() => { router.replace("/account/orders"); router.refresh(); }} className="mt-7 min-h-12 w-full rounded-xl bg-[#171717] text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-[#b99a76] hover:text-[#171717]">GO TO ACCOUNT</button>
          </section>
        ) : (
        <form onSubmit={stage === "details" ? requestCode : verify} className="w-full max-w-lg rounded-3xl border border-[#e9e4dc] bg-white p-6 shadow-[0_20px_70px_rgba(30,24,18,0.05)] sm:p-9">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">HOVER UP ACCOUNT</p>
          <h1 className="mt-3 text-3xl font-semibold">{stage === "details" ? "Create your account" : "Verify your email"}</h1>
          <p className="mt-2 text-sm text-[#888]">{stage === "details" ? "Your guest orders placed with this email will be connected to your account." : `A verification OTP has been sent to ${email.trim().toLowerCase()}. Enter it below. Your account will only be created after successful verification.`}</p>
          {notice && stage === "verify" && <p role="status" className="mt-4 rounded-xl border border-[#d8e8d8] bg-[#f4faf3] px-4 py-3 text-xs leading-5 text-[#426b43]">{notice}</p>}
          {stage === "details" ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-[#5f574e]">First name *<input required autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} className={field} /></label>
              <label className="text-xs font-medium text-[#5f574e]">Last name<input autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} className={field} /></label>
              <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Email address *<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className={field} /></label>
              <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Contact number *<input required type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} className={field} /></label>
              <label className="text-xs font-medium text-[#5f574e] sm:col-span-2">Password *<div className="relative"><input required type={showPassword ? "text" : "password"} minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className={`${field} pr-12`} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#777]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><span className="mt-1 block text-[10px] font-normal text-[#999]">Use at least 8 characters.</span></label>
            </div>
          ) : (
            <div className="mt-7">
              <label className="text-xs font-medium text-[#5f574e]">6-digit verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g, "").slice(0,6))} className={`${field} text-center text-xl tracking-[0.45em]`} /></label>
              <p className="mt-3 text-xs text-[#888]">The code expires in 10 minutes. Check your inbox and spam folder.</p>
              <button type="button" onClick={() => { setStage("details"); setCode(""); setError(""); }} className="mt-4 text-xs font-semibold text-[#8b7054] underline">Change registration details</button>
            </div>
          )}
          {error && <p role="alert" className="mt-4 text-xs text-[#a14d3d]">{error}</p>}
          <button disabled={loading} className="mt-6 min-h-12 w-full rounded-xl bg-[#171717] text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50">{loading ? "PLEASE WAIT..." : stage === "details" ? "CREATE ACCOUNT" : "VERIFY OTP & CREATE ACCOUNT"}</button>
          {stage === "verify" && <button type="button" disabled={loading} onClick={() => requestCode()} className="mt-4 w-full text-xs font-semibold text-[#8b7054] underline disabled:opacity-50">Resend verification code</button>}
          <p className="mt-6 text-center text-xs text-[#888]">Already have an account? <Link href="/account/login" className="font-semibold text-[#8b7054] underline">Sign in</Link></p>
        </form>
        )}
      </main>
      <StorefrontFooter />
    </>
  );
}
