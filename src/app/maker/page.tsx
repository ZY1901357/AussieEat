"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ChefHat,
  CirclePlus,
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
};

type Meal = {
  id: number;
  maker_id: number;
  title: string;
  description: string;
  price: number;
  image_data: string;
};

type MakerOrder = {
  id: number;
  maker_id: number;
  eater_id: number | null;
  order_code: string;
  meal_name: string;
  price: number;
  order_time: string;
  status: string;
};

type FormState = {
  title: string;
  description: string;
  price: string;
  imageData: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  price: "",
  imageData: "",
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

export default function MakerHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [status, setStatus] = useState<{ error: string | null }>({
    error: null,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState({
    revenueToday: 0,
    completedToday: 0,
    activeOrders: 0,
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
    if (!user || user.role !== "maker") {
      setLoadingMeals(false);
      return;
    }

    const fetchMeals = async () => {
      setLoadingMeals(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/meals?maker_id=${user.id}`
        );
        if (!response.ok) {
          throw new Error("Failed to load meals");
        }
        const data = (await response.json()) as Meal[];
        setMeals(data);
        setStatus({ error: null });
      } catch (error) {
        setStatus({
          error:
            error instanceof Error ? error.message : "Unable to load meals",
        });
      } finally {
        setLoadingMeals(false);
      }
    };

    fetchMeals();
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "maker") {
      setSummary({ revenueToday: 0, completedToday: 0, activeOrders: 0 });
      setLoadingSummary(false);
      setSummaryError(null);
      return;
    }

    let cancelled = false;

    const fetchSummary = async () => {
      setLoadingSummary(true);
      setSummaryError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/orders?maker_id=${user.id}`
        );
        if (!response.ok) {
          throw new Error("Failed to load orders summary");
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
        let activeCount = 0;

        for (const order of data) {
          if (order.status !== "completed") {
            activeCount += 1;
          }

          if (order.status === "completed") {
            const orderDate = parseOrderTimestamp(order.order_time);
            if (!orderDate) continue;
            if (orderDate >= startOfToday && orderDate < endOfToday) {
              const priceValue =
                typeof order.price === "number"
                  ? order.price
                  : Number(order.price);
              if (!Number.isFinite(priceValue)) continue;
              revenue += priceValue;
              completedCount += 1;
            }
          }
        }

        setSummary({
          revenueToday: revenue,
          completedToday: completedCount,
          activeOrders: activeCount,
        });
        setSummaryError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setSummary({ revenueToday: 0, completedToday: 0, activeOrders: 0 });
        setSummaryError(
          error instanceof Error
            ? error.message
            : "Unable to load orders summary"
        );
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

  const headline = useMemo(() => {
    if (!user) return "Hi, Maker!";
    const name = user.email.split("@")[0];
    return `Hi, ${name}!`;
  }, [user]);

  const handleImageChange = (file?: File | null) => {
    if (!file) {
      setForm((prev) => ({ ...prev, imageData: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm((prev) => ({ ...prev, imageData: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm(initialForm);
    setSubmitting(false);
  };

  const handleCreateMeal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    if (!form.imageData) {
      setStatus({ error: "Please add an image for this meal." });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker_id: user.id,
          title: form.title.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          image_data: form.imageData,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body?.detail
            ? typeof body.detail === "string"
              ? body.detail
              : JSON.stringify(body.detail)
            : "Unable to add meal"
        );
      }

      setMeals((prev) => [body as Meal, ...prev]);
      setStatus({ error: null });
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      setStatus({
        error: error instanceof Error ? error.message : "Unable to add meal",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    resetForm();
    setIsModalOpen(false);
  };

  return (
    <main className="relative min-h-full overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-24 rounded-b-[2rem] bg-[radial-gradient(circle_at_top,_#f37460,_#ffdd86_45%,_transparent_90%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[2.5rem] bg-[radial-gradient(circle_at_bottom,_#f6a36b,_#f8c691_50%,_transparent_100%)]" />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-32 pt-16">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#2d2a26]">
              {headline}
            </h1>
            <p className="mt-1 text-sm font-medium text-neutral-500">
              Let's not waste
            </p>
          </div>
          <div className="flex size-12 items-center justify-center rounded-full border border-white/40 bg-white/80 shadow-[0_6px_16px_rgba(243,138,110,0.2)]">
            <ChefHat className="size-6 text-[#f37460]" aria-hidden />
          </div>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-4 text-neutral-900">
          <div className="rounded-3xl bg-white/95 px-5 py-4 shadow-[0_10px_22px_rgba(248,137,110,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Today's income
            </p>
            <p className="mt-2 text-3xl font-semibold text-[#f37460]">
              {loadingSummary
                ? "…"
                : summaryError
                  ? "--"
                  : `$${summary.revenueToday.toFixed(2)}`}
            </p>
            <p className="mt-1 text-xs font-semibold text-neutral-500">
              {loadingSummary
                ? "Calculating completed orders"
                : summaryError
                  ? "Check orders to refresh data"
                  : `${summary.completedToday} orders completed`}
            </p>
          </div>
          <div className="rounded-3xl bg-[linear-gradient(135deg,_#f99d90,_#ffd27a)] px-5 py-4 text-white shadow-[0_12px_26px_rgba(249,148,115,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              Active orders
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {loadingSummary ? "…" : summaryError ? "--" : summary.activeOrders}
            </p>
            <p className="mt-1 text-xs font-semibold text-white/80">
              Keep the line moving
            </p>
          </div>
        </div>
        {summaryError ? (
          <p className="mt-3 text-xs font-semibold text-red-500">
            {summaryError}
          </p>
        ) : null}

        <section className="mt-10 flex-1">
          {status.error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {status.error}
            </p>
          ) : null}
          {loadingMeals ? (
            <p className="py-10 text-center text-sm font-semibold text-neutral-500">
              Loading meals…
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {meals.map((meal) => (
                <article
                  key={meal.id}
                  className="rounded-3xl bg-white shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
                >
                  <div className="relative h-24 w-full overflow-hidden rounded-t-3xl">
                    <Image
                      src={meal.image_data}
                      alt={meal.title}
                      fill
                      sizes="160px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="space-y-1 px-4 py-3 text-left">
                    <div className="flex items-center justify-between text-sm font-semibold text-neutral-900">
                      <span className="truncate">{meal.title}</span>
                      <span>${meal.price.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-neutral-500 line-clamp-2">
                      {meal.description}
                    </p>
                  </div>
                </article>
              ))}
              <button
                type="button"
                onClick={openModal}
                className="flex h-44 flex-col items-center justify-center rounded-3xl bg-white shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition hover:-translate-y-1"
              >
                <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f99d90] to-[#ffd27a] shadow-[0_10px_18px_rgba(249,148,115,0.25)]">
                  <CirclePlus className="size-8 text-white" />
                </span>
                <p className="mt-4 text-sm font-semibold text-[#f38f6b]">
                  Add meal
                </p>
              </button>
            </div>
          )}
        </section>

        <nav className="mt-10 w-full">
          <div className="flex items-center justify-between rounded-[2.25rem] bg-[#f6a36b] px-6 py-4 text-neutral-900 shadow-[0_-8px_28px_rgba(243,152,118,0.25)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center text-xs font-semibold transition hover:text-white ${
                  item.href === "/maker" ? "text-white" : ""
                }`}
              >
                <item.icon className="mb-1 size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {isModalOpen ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">
                Add new meal
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-sm font-semibold text-[#f37460] transition hover:text-[#f05c45]"
              >
                Close
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleCreateMeal}>
              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Meal image</span>
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#f2c9ae] bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-500">
                  {form.imageData ? (
                    <Image
                      src={form.imageData}
                      alt="Meal preview"
                      width={200}
                      height={120}
                      className="mb-3 h-24 w-full rounded-xl object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="mb-3 text-xs text-neutral-400">
                      Upload a photo to showcase your meal
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      handleImageChange(file);
                    }}
                    className="block text-xs text-neutral-600"
                  />
                </div>
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Meal title</span>
                <Input
                  name="title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="e.g. Food 1"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Share a short story about this meal"
                  required
                  className="min-h-[96px] w-full resize-none rounded-2xl border border-[#f2c9ae] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#f38f6b] focus:ring-2 focus:ring-[#f38f6b]/30"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Price</span>
                <Input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, price: event.target.value }))
                  }
                  placeholder="Enter price"
                  required
                />
              </label>

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-base font-semibold text-neutral-900 shadow-[0_16px_30px_rgba(248,137,110,0.35)] transition hover:brightness-105 focus-visible:ring-[#f87664]/40 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {submitting ? "Adding…" : "Add meal"}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
