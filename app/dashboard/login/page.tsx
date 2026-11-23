
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

export default function DashboardLoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f6f2] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] max-w-[1440px] overflow-hidden rounded-2xl bg-white shadow-[0_15px_70px_rgba(30,25,20,0.06)] lg:min-h-[calc(100vh-64px)] lg:grid-cols-2">

        {/* LEFT BRAND PANEL */}
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#111111] p-10 text-white lg:flex xl:p-14">
          <div className="absolute -right-32 top-20 h-[420px] w-[420px] rounded-full border border-white/[0.07]" />
          <div className="absolute -right-20 top-32 h-[320px] w-[320px] rounded-full border border-white/[0.07]" />
          <div className="absolute -bottom-40 -left-20 h-[400px] w-[400px] rounded-full bg-[#b99a76]/10 blur-3xl" />

          <Link href="/" className="relative z-10 inline-block w-fit">
            <span className="text-2xl font-black tracking-[0.17em]">
              HOVER UP<span className="text-[#b99a76]">.</span>
            </span>
            <span className="mt-1 block text-[9px] tracking-[0.3em] text-white/45">
              YOUR STYLE. YOUR STATEMENT.
            </span>
          </Link>

          <div className="relative z-10 max-w-lg">
            <p className="text-[10px] tracking-[0.3em] text-[#b99a76]">
              THE HOVER UP WORKSPACE
            </p>

            <h1 className="mt-6 font-[var(--font-playfair)] text-5xl leading-[1.15] xl:text-6xl">
              Manage your store.
              <span className="mt-2 block text-[#b99a76]">
                Shape your brand.
              </span>
            </h1>

            <p className="mt-7 max-w-md text-sm leading-7 text-white/55">
              Your central workspace for products, orders, customers,
              inventory and everything that keeps Hover Up moving.
            </p>

            <div className="mt-12 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15">
                <ShieldCheck size={18} className="text-[#b99a76]" />
              </div>
              <div>
                <p className="text-xs text-white/85">
                  Secure workspace access
                </p>
                <p className="mt-1 text-[10px] text-white/40">
                  Designed for authorised team members
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5">
            <p className="text-[10px] tracking-[0.15em] text-white/35">
              © 2026 HOVER UP
            </p>
            <p className="text-[10px] text-white/35">
              ADMINISTRATION PORTAL
            </p>
          </div>
        </section>

        {/* RIGHT LOGIN PANEL */}
        <section className="flex min-h-[calc(100vh-32px)] flex-col justify-between px-5 py-7 sm:px-10 lg:min-h-0 lg:px-12 xl:px-20">
          <div className="flex items-center justify-between lg:justify-end">
            <Link href="/" className="lg:hidden">
              <span className="text-xl font-black tracking-[0.15em] text-[#111111]">
                HOVER UP<span className="text-[#b99a76]">.</span>
              </span>
            </Link>

            <Link
              href="/"
              className="flex items-center gap-1 text-xs text-[#817b72] transition hover:text-[#b99a76]"
            >
              Visit storefront
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="mx-auto w-full max-w-[400px] py-12">
            <div className="mb-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3eee7] text-[#94795c]">
                <LockKeyhole size={21} strokeWidth={1.7} />
              </div>

              <p className="text-[10px] tracking-[0.24em] text-[#a18c75]">
                WELCOME BACK
              </p>

              <h2 className="mt-3 font-[var(--font-playfair)] text-4xl text-[#111111]">
                Sign in.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#817b72]">
                Enter your authorised account details to access the Hover Up
                workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-medium text-[#37332e]"
                >
                  Email address
                </label>

                <div className="flex h-12 items-center gap-3 rounded-xl border border-[#e8e2d9] bg-[#fcfbf9] px-4 transition focus-within:border-[#b99a76] focus-within:bg-white">
                  <Mail size={17} className="text-[#a39b90]" />

                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    className="h-full w-full bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#b2aca3]"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium text-[#37332e]"
                  >
                    Password
                  </label>
                </div>

                <div className="flex h-12 items-center gap-3 rounded-xl border border-[#e8e2d9] bg-[#fcfbf9] px-4 transition focus-within:border-[#b99a76] focus-within:bg-white">
                  <LockKeyhole size={17} className="text-[#a39b90]" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-full w-full bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#b2aca3]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-[#999187] transition hover:text-[#111111]"
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* ERROR MESSAGE */}
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600"
                >
                  {error}
                </p>
              )}

              {/* SIGN IN BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111111] text-sm text-white transition duration-300 hover:bg-[#b99a76] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Signing in..." : "Sign in to workspace"}

                {!isLoading && (
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>

              <p className="text-center text-[10px] leading-5 text-[#aaa39a]">
                Access is restricted to authorised Hover Up team members.
              </p>
            </form>

            <div className="mt-9 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#eee9e2]" />
              <span className="text-[9px] tracking-[0.15em] text-[#aaa39a]">
                HOVER UP WORKSPACE
              </span>
              <div className="h-px flex-1 bg-[#eee9e2]" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#eee9e2] pt-5">
            <p className="text-[10px] text-[#aaa39a]">
              © 2026 Hover Up. All rights reserved.
            </p>
            <p className="text-[10px] text-[#aaa39a]">
              Secure admin access
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
