"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  BadgeDollarSign,
  Home,
  MessageSquare,
  Timer,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";

type StoredUser = {
  id: number;
  email: string;
  role: string;
  profile?: MakerProfile;
};

type MakerProfile = {
  name: string;
  email: string;
  phone: string;
  country: string;
  location: string;
};

type MakerOrder = {
  id: number;
  maker_id: number;
  status: string;
  price: number;
  order_time: string;
};

const defaultProfile: MakerProfile = {
  name: "Chef's Corner",
  email: "maker@mail.com",
  phone: "+61 3 8652 1453",
  country: "Australia",
  location: "Shop LGSS09, 99 Spencer St, Docklands VIC 3008",
};

const navItems = [
  { href: "/maker", label: "Home", icon: Home },
  { href: "/maker/orders", label: "Order", icon: Timer },
  { href: "/maker/comments", label: "Comment", icon: MessageSquare },
  { href: "/maker/profile", label: "Profile", icon: UserRound },
] as const;

function loadStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("aussieeat.user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function parseOrderTimestamp(timestamp: string | null | undefined): Date | null {
  if (!timestamp) return null;
  const trimmed = timestamp.trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const canonical = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const hasTimezone =
    /[+-]\d{2}:?\d{2}$/.test(canonical) || canonical.endsWith("Z");
  const isoCandidate = hasTimezone ? canonical : `${canonical}Z`;
  const parsed = new Date(isoCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function MakerProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<MakerProfile>(defaultProfile);
  const [draft, setDraft] = useState<MakerProfile>(defaultProfile);
  const [status, setStatus] = useState<{ message: string | null; error: string | null }>({
    message: null,
    error: null,
  });
  const [summary, setSummary] = useState<{ revenueToday: number; completedToday: number }>({
    revenueToday: 0,
    completedToday: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    setUser(loadStoredUser());
  }, []);

  useEffect(() => {
    if (user && user.role !== "maker") {
      router.replace("/login?role=maker");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/maker/profile?maker_id=${user.id}`
        );
        if (!response.ok) {
          throw new Error("Unable to load profile");
        }
        const data = (await response.json()) as MakerProfile;
        setProfile(data);
        setDraft(data);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "aussieeat.user",
            JSON.stringify({ ...user, profile: data })
          );
        }
        setStatus({ message: null, error: null });
      } catch (error) {
        setStatus({
          message: null,
          error: error instanceof Error ? error.message : "Failed to load profile",
        });
        const fallback = user.profile ?? defaultProfile;
        setProfile(fallback);
        setDraft(fallback);
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "maker") {
      setSummary({ revenueToday: 0, completedToday: 0 });
      setSummaryError(null);
      setLoadingSummary(false);
      return;
    }

    let cancelled = false;

    const fetchSummary = async () => {
      setLoadingSummary(true);
      setSummaryError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders?maker_id=${user.id}`);
        if (!response.ok) {
          throw new Error("Unable to load today's income");
        }
        const data = (await response.json()) as MakerOrder[];
        if (cancelled) {
          return;
        }

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);

        let revenue = 0;
        let completedCount = 0;
        for (const order of data) {
          if (order.status !== "completed") {
            continue;
          }
          const orderDate = parseOrderTimestamp(order.order_time);
          if (!orderDate) {
            continue;
          }
          if (orderDate >= startOfToday && orderDate < endOfToday) {
            const priceValue =
              typeof order.price === "number" ? order.price : Number(order.price);
            if (!Number.isFinite(priceValue)) {
              continue;
            }
            revenue += priceValue;
            completedCount += 1;
          }
        }

        setSummary({ revenueToday: revenue, completedToday: completedCount });
      } catch (error) {
        if (!cancelled) {
          setSummary({ revenueToday: 0, completedToday: 0 });
          setSummaryError(error instanceof Error ? error.message : "Unable to load today's income");
        }
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    };

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("aussieeat.user");
    }
    router.replace("/login?role=maker");
  };

  const handleSaveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    const submit = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/maker/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maker_id: user.id,
            ...draft,
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(
            body?.detail
              ? typeof body.detail === "string"
                ? body.detail
                : JSON.stringify(body.detail)
              : "Unable to save profile"
          );
        }

        const updatedProfile = body as MakerProfile;
        const updatedUser: StoredUser = {
          ...user,
          profile: updatedProfile,
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "aussieeat.user",
            JSON.stringify(updatedUser)
          );
        }
        setUser(updatedUser);
        setProfile(updatedProfile);
        setDraft(updatedProfile);
        setIsEditing(false);
        setStatus({ message: "Profile updated", error: null });
      } catch (error) {
        setStatus({
          message: null,
          error: error instanceof Error ? error.message : "Unable to save profile",
        });
      }
    };

    submit();
  };

  const makerName = useMemo(() => {
    if (profile.name) {
      return profile.name;
    }
    if (user) {
      const username = user.email.split("@")[0];
      return `${username}'s Corner`;
    }
    return "Chef's Corner";
  }, [profile.name, user]);

  const handleChange = (field: keyof MakerProfile, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const openEditor = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraft(profile);
    setIsEditing(false);
  };

  return (
    <main className="relative min-h-full overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-24 rounded-b-[2rem] bg-[radial-gradient(circle_at_top,_#f37460,_#ffdd86_45%,_transparent_90%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[2.5rem] bg-[radial-gradient(circle_at_bottom,_#f6a36b,_#f8c691_50%,_transparent_100%)]" />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-32 pt-16 text-neutral-900">
        <header className="flex flex-col items-center gap-4">
          <div className="relative flex size-28 items-center justify-center rounded-full border-4 border-white/80 bg-white/90 shadow-[0_12px_24px_rgba(243,138,110,0.28)]">
            <BadgeDollarSign className="size-12 text-[#f37460]" aria-hidden />
            <button
              type="button"
              onClick={openEditor}
              className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-white bg-[#f37460] text-white shadow"
            >
              ✏️
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-neutral-900">
              {makerName}
            </h1>
            <p className="mt-1 text-sm font-medium text-neutral-500">
              Always serving something special
            </p>
          </div>
        </header>

        <section className="mt-10 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-neutral-600">
              Restaurant Info
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-[0_10px_18px_rgba(0,0,0,0.08)]">
                <span className="text-sm font-medium text-neutral-500">Name</span>
                <span className="text-sm font-semibold text-neutral-800">
                  {profile.name}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-[0_10px_18px_rgba(0,0,0,0.08)]">
                <span className="text-sm font-medium text-neutral-500">Email</span>
                <span className="text-sm font-semibold text-neutral-800">
                  {profile.email}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-[0_10px_18px_rgba(0,0,0,0.08)]">
                <span className="text-sm font-medium text-neutral-500">
                  Phone number
                </span>
                <span className="text-sm font-semibold text-neutral-800">
                  {profile.phone}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-5 py-3 shadow-[0_10px_18px_rgba(0,0,0,0.08)]">
                <span className="text-sm font-medium text-neutral-500">
                  Country
                </span>
                <span className="text-sm font-semibold text-neutral-800">
                  {profile.country}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-neutral-600">Location</p>
            <div className="flex items-center gap-3 rounded-3xl bg-white px-5 py-4 shadow-[0_10px_18px_rgba(0,0,0,0.08)]">
              <span className="rounded-full bg-[#e7f8ed] px-2 py-1 text-xs font-semibold text-[#2f9e59]">
                📍
              </span>
              <span className="text-sm font-medium text-neutral-700">
                {profile.location}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-neutral-600">
              Income of the Day:
            </p>
            <div className="rounded-3xl bg-white px-6 py-5 text-center shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
              <p className="text-5xl font-semibold tracking-wide text-[#f37460]">
                {loadingSummary
                  ? "…"
                  : summaryError
                    ? "--"
                    : `$${summary.revenueToday.toFixed(2)}`}
              </p>
              <p className="mt-2 text-sm font-medium text-neutral-500">
                {loadingSummary
                  ? "Refreshing completed orders"
                  : summaryError
                    ? summaryError
                    : `${summary.completedToday} orders completed today`}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={openEditor}
            className="h-12 w-full rounded-3xl border border-[#f2c9ae] bg-white text-base font-semibold text-neutral-800 shadow-[0_10px_18px_rgba(243,153,122,0.18)] hover:bg-white"
          >
            Edit profile
          </Button>

          <Button
            type="button"
            onClick={handleLogout}
            className="h-12 w-full rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-base font-semibold text-neutral-900 shadow-[0_16px_30px_rgba(248,137,110,0.35)] transition hover:brightness-105 focus-visible:ring-[#f87664]/40"
          >
            Log out
          </Button>
        </section>

        {status.error ? (
          <p className="mt-6 text-center text-sm font-semibold text-red-500">
            {status.error}
          </p>
        ) : null}
        {status.message ? (
          <p className="mt-6 text-center text-sm font-semibold text-emerald-600">
            {status.message}
          </p>
        ) : null}

        <nav className="mt-auto w-full pt-12">
          <div className="flex items-center justify-between rounded-[2.25rem] bg-[#f6a36b] px-6 py-4 text-neutral-900 shadow-[0_-8px_28px_rgba(243,152,118,0.25)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center text-xs font-semibold transition hover:text-white ${
                  item.href === "/maker/profile" ? "text-white" : ""
                }`}
              >
                <item.icon className="mb-1 size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {isEditing ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                Edit restaurant info
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="text-sm font-semibold text-[#f37460] transition hover:text-[#f05c45]"
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSaveProfile}>
              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Name</span>
                <Input
                  value={draft.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="Chef's Corner"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Email</span>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  placeholder="maker@example.com"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Phone number</span>
                <Input
                  value={draft.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  placeholder="+61 3 8652 1453"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Country</span>
                <Input
                  value={draft.country}
                  onChange={(event) =>
                    handleChange("country", event.target.value)
                  }
                  placeholder="Australia"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Location</span>
                <textarea
                  value={draft.location}
                  onChange={(event) =>
                    handleChange("location", event.target.value)
                  }
                  className="min-h-[96px] w-full resize-none rounded-2xl border border-[#f2c9ae] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#f38f6b] focus:ring-2 focus:ring-[#f38f6b]/30"
                  placeholder="Shop address"
                  required
                />
              </label>

              <Button
                type="submit"
                className="h-12 w-full rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-base font-semibold text-neutral-900 shadow-[0_16px_30px_rgba(248,137,110,0.35)] transition hover:brightness-105 focus-visible:ring-[#f87664]/40"
              >
                Save changes
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
