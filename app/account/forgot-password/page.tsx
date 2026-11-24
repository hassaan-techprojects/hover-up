"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import StorefrontHeader from "@/components/storefront/storefront-header";
import StorefrontFooter from "@/components/storefront/storefront-footer";

type Stage = "email" | "verify" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [stage, setStage] = useState<Stage>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const field = "mt-2 w-full rounded-xl border border-[#e7e2da] px-4 py-3 text-sm outline-none focus:border-[#b99a76] focus:ring-2 focus:ring-[#b99a76]/15";

  async function requestCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/account/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to request a verification code.");
      setStage("verify"); setNotice(data.message || "If an account exists for that email, a verification code has been sent.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to request a verification code."); }
    finally { setLoading(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/account/forgot-password/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase(), code }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to verify your code.");
      setResetToken(data.resetToken); setStage("password");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to verify your code."); }
    finally { setLoading(false); }
  }

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setNotice("");
    if (password !== confirmPassword) { setError("Your passwords do not match."); setLoading(false); return; }
    try {
      const response = await fetch("/api/account/forgot-password/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase(), resetToken, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update your password.");
      setStage("done"); setNotice(data.message || "Your password has been updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update your password."); }
    finally { setLoading(false); }
  }

  const titles: Record<Stage, string> = { email: "Forgot your password?", verify: "Verify your email", password: "Create a new password", done: "Password updated" };
  const descriptions: Record<Stage, string> = {
    email: "Enter the email address linked to your Hover Up account. We'll send you a verification code.",
    verify: `Enter the 6-digit code sent to ${email.trim().toLowerCase()}.`,
    password: "Your email is verified. Choose a new password for your account.",
    done: "Your password has been changed successfully. You can now sign in with your new password.",
  };

  return (
    <>
      <StorefrontHeader />
      <main className="flex min-h-[65vh] items-center justify-center bg-[#faf9f7] px-5 py-14">
        <form onSubmit={stage === "email" ? requestCode : stage === "verify" ? verify : reset} className="w-full max-w-md rounded-3xl border border-[#e9e4dc] bg-white p-6 shadow-[0_20px_70px_rgba(30,24,18,0.05)] sm:p-9">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-[#a18c75]">HOVER UP ACCOUNT</p>
          <h1 className="mt-3 text-3xl font-semibold">{titles[stage]}</h1>
          <p className="mt-2 text-sm leading-6 text-[#888]">{descriptions[stage]}</p>
          {stage === "email" && <label className="mt-7 block text-xs font-medium text-[#5f574e]">Email address<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className={field} /></label>}
          {stage === "verify" && <label className="mt-7 block text-xs font-medium text-[#5f574e]">6-digit verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g, "").slice(0,6))} className={`${field} text-center text-xl tracking-[0.45em]`} /></label>}
          {stage === "password" && <div className="mt-7 space-y-4">
            <label className="block text-xs font-medium text-[#5f574e]">New password<div className="relative"><input required minLength={8} maxLength={128} type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className={`${field} pr-12`} /><button type="button" onClick={() => setShowPassword(v=>!v)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#777]">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
            <label className="block text-xs font-medium text-[#5f574e]">Confirm new password<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className={field} /></label>
            <p className="text-[10px] text-[#999]">Use at least 8 characters.</p>
          </div>}
          {notice && <p role="status" className="mt-4 text-xs text-[#6f755c]">{notice}</p>}
          {error && <p role="alert" className="mt-4 text-xs text-[#a14d3d]">{error}</p>}
          {stage !== "done" ? <button disabled={loading} className="mt-6 min-h-12 w-full rounded-xl bg-[#171717] text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-[#b99a76] hover:text-[#171717] disabled:opacity-50">{loading ? "PLEASE WAIT..." : stage === "email" ? "SEND VERIFICATION CODE" : stage === "verify" ? "VERIFY EMAIL" : "UPDATE PASSWORD"}</button> : <button type="button" onClick={() => router.push("/account/login")} className="mt-6 min-h-12 w-full rounded-xl bg-[#171717] text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-[#b99a76] hover:text-[#171717]">GO TO SIGN IN</button>}
          {stage === "verify" && <button type="button" disabled={loading} onClick={() => requestCode()} className="mt-4 w-full text-xs font-semibold text-[#8b7054] underline disabled:opacity-50">Resend verification code</button>}
          {stage !== "done" && <p className="mt-6 text-center text-xs text-[#888]"><Link href="/account/login" className="font-semibold text-[#8b7054] underline">Back to sign in</Link></p>}
        </form>
      </main>
      <StorefrontFooter />
    </>
  );
}
