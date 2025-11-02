"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  ArrowLeft,
  Heart,
  Home,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

type StatusState = {
  loading: boolean;
  error: string | null;
  message: string | null;
};

const initialStatus: StatusState = { loading: false, error: null, message: null };

function extractErrorMessage(body: unknown, fallback: string): string {
  if (!body) return fallback;
  if (typeof body === "string") return body;
  if (typeof body === "object") {
    if ("detail" in (body as Record<string, unknown>)) {
      const detail = (body as Record<string, unknown>)["detail"];
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        return detail
          .map((item) => {
            if (!item) return "";
            if (typeof item === "string") return item;
            if (typeof item === "object" && "msg" in item) {
              return String(item.msg);
            }
            return JSON.stringify(item);
          })
          .join(" ")
          .trim() || fallback;
      }
    }
    if ("message" in (body as Record<string, unknown>)) {
      const message = (body as Record<string, unknown>)["message"];
      if (typeof message === "string") return message;
    }
  }
  return fallback;
}

type LoginViewProps = {
  initialRole?: string | null;
};

export function LoginView({ initialRole }: LoginViewProps) {
  const router = useRouter();
  const memoizedRole = initialRole?.toLowerCase();

  const heading =
    memoizedRole === "maker"
      ? "Welcome back, Maker!"
      : memoizedRole === "eater"
        ? "Welcome back, Eater!"
        : "Welcome back you've been missed!";

  const [status, setStatus] = useState<StatusState>(initialStatus);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const password = (formData.get("password") as string | null) ?? "";

    setStatus({ loading: true, error: null, message: null });

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(extractErrorMessage(body, "Unable to login"));
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("aussieeat.user", JSON.stringify(body));
      }

      setStatus({
        loading: false,
        error: null,
        message: "Login successful! Redirecting…",
      });

      setTimeout(() => {
        const redirect =
          body?.role === "maker" ? "/maker" : body?.role === "eater" ? "/eater" : "/";
        router.push(redirect);
      }, 600);
    } catch (error) {
      setStatus({
        loading: false,
        error: error instanceof Error ? error.message : "Unexpected error",
        message: null,
      });
    }
  };

  return (
    <main className="relative min-h-full overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-24 rounded-b-[2rem] bg-[radial-gradient(circle_at_top,_#f37460,_#ffdd86_45%,_transparent_90%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[2.5rem] bg-[radial-gradient(circle_at_bottom,_#f6a36b,_#f8c691_50%,_transparent_100%)]" />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-32 pt-16">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-neutral-700 shadow-[0_6px_16px_rgba(243,138,110,0.25)]"
          >
            <ArrowLeft className="size-4 text-[#f37460]" aria-hidden />
            Back
          </Link>
          <span className="rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[#f37460] shadow-[0_6px_16px_rgba(243,138,110,0.25)]">
            Aussie Eat
          </span>
        </div>

        <header className="mt-8 text-center text-neutral-900">
          <h1 className="text-3xl font-semibold text-[#ff775d]">Login here</h1>
          <p className="mt-4 text-lg font-semibold text-neutral-800">{heading}</p>
        </header>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="space-y-2 text-left text-sm font-medium text-neutral-700">
            <span>Email</span>
            <div className="rounded-2xl bg-gradient-to-r from-[#f89a79] via-[#fbbd7f] to-[#ffd97d] p-[1.5px] shadow-[0_10px_24px_rgba(249,140,112,0.2)]">
              <div className="rounded-[1.125rem] bg-white/95 px-4 py-0.5">
                <Input
                  type="email"
                  placeholder="Email"
                  name="email"
                  autoComplete="email"
                  className="h-12 border-none bg-transparent px-0 text-base font-medium text-neutral-900 placeholder:text-neutral-400 focus-visible:border-none focus-visible:ring-0"
                  required
                />
              </div>
            </div>
          </label>

          <label className="space-y-2 text-left text-sm font-medium text-neutral-700">
            <span>Password</span>
            <div className="rounded-2xl bg-gradient-to-r from-[#dbe2ff] via-[#ebeefe] to-[#f9f5ff] p-[1.5px] shadow-[0_10px_24px_rgba(153,168,255,0.18)]">
              <div className="rounded-[1.125rem] bg-[#f2f5ff] px-4 py-0.5">
                <Input
                  type="password"
                  placeholder="Password"
                  name="password"
                  autoComplete="current-password"
                  className="h-12 border-none bg-transparent px-0 text-base font-medium text-neutral-900 placeholder:text-neutral-400 focus-visible:border-none focus-visible:ring-0"
                  required
                />
              </div>
            </div>
          </label>

          <Button
            type="submit"
            disabled={status.loading}
            className="mt-6 h-12 w-full rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-base font-semibold text-neutral-900 shadow-[0_16px_30px_rgba(248,137,110,0.35)] transition hover:brightness-105 focus-visible:ring-[#f87664]/40 disabled:cursor-not-allowed disabled:opacity-80"
          >
            {status.loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {status.error ? (
          <p className="mt-4 text-center text-sm font-semibold text-red-500">
            {status.error}
          </p>
        ) : null}
        {status.message ? (
          <p className="mt-4 text-center text-sm font-semibold text-emerald-600">
            {status.message}
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          <Button
            asChild
            variant="outline"
            disabled={status.loading}
            className="h-12 w-full rounded-3xl border border-[#f2c9ae] bg-white/90 text-base font-semibold text-[#f37460] shadow-[0_10px_18px_rgba(243,153,122,0.18)] hover:bg-white"
          >
            <Link href={memoizedRole ? `/signup?role=${memoizedRole}` : "/signup"}>
              Create new account
            </Link>
          </Button>
        </div>

        <nav className="mt-auto w-full">
          <div className="mt-10 flex items-center justify-between rounded-[2.25rem] bg-[#f6a36b] px-6 py-4 text-neutral-900 shadow-[0_-8px_28px_rgba(243,152,118,0.25)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center text-xs font-semibold transition hover:text-white"
              >
                <item.icon className="mb-1 size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
