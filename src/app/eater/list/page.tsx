"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ChefHat,
  Home as HomeIcon,
  MapPin,
  ShoppingCart,
  Store,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type StoredUser = {
  id: number;
  email: string;
  role: string;
};

type MakerSummary = {
  maker_id: number;
  name: string;
  location: string;
  meal_count: number;
  featured_meal_name: string | null;
  featured_meal_image: string | null;
};

type Meal = {
  id: number;
  maker_id: number;
  title: string;
  description: string;
  price: number;
  image_data: string;
};

const navItems = [
  { href: "/eater", label: "Home", icon: HomeIcon },
  { href: "/eater/list", label: "List", icon: Store },
  { href: "/eater/orders", label: "Orders", icon: ShoppingCart },
  { href: "/eater/profile", label: "Profile", icon: UserRound },
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

export default function EaterListPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  const [makers, setMakers] = useState<MakerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMaker, setSelectedMaker] = useState<MakerSummary | null>(null);
  const [makerMeals, setMakerMeals] = useState<Record<number, Meal[]>>({});
  const [mealsLoading, setMealsLoading] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);

  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderStatus, setOrderStatus] = useState<{ message: string | null; error: string | null }>(
    { message: null, error: null },
  );

  useEffect(() => {
    setUser(loadStoredUser());
  }, []);

  useEffect(() => {
    if (user && user.role !== "eater") {
      router.replace("/login?role=eater");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchMakers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/makers`);
        if (!response.ok) {
          throw new Error("Unable to load makers right now.");
        }
        const data = (await response.json()) as MakerSummary[];
        setMakers(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load makers");
      } finally {
        setLoading(false);
      }
    };

    fetchMakers();
  }, []);

  const eaterName = useMemo(() => {
    if (!user?.email) return "Eater";
    return user.email.split("@")[0]?.replace(/\W+/g, " ")?.trim() || "Eater";
  }, [user]);

  const openMaker = useCallback(
    async (maker: MakerSummary) => {
      setSelectedMaker(maker);
      setMealError(null);
      setOrderStatus({ message: null, error: null });
      setSelectedMeal(null);

      if (makerMeals[maker.maker_id]) {
        return;
      }

      setMealsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/meals?maker_id=${maker.maker_id}`);
        if (!response.ok) {
          throw new Error("Unable to load this maker's meals right now.");
        }
        const data = (await response.json()) as Meal[];
        setMakerMeals((prev) => ({ ...prev, [maker.maker_id]: data }));
      } catch (err) {
        setMealError(err instanceof Error ? err.message : "Failed to load meals");
      } finally {
        setMealsLoading(false);
      }
    },
    [makerMeals],
  );

  const closeMaker = () => {
    if (ordering) return;
    setSelectedMaker(null);
    setSelectedMeal(null);
    setOrderStatus({ message: null, error: null });
  };

  const openMeal = (meal: Meal) => {
    setSelectedMeal(meal);
    setOrderStatus({ message: null, error: null });
  };

  const closeMeal = () => {
    if (ordering) return;
    setSelectedMeal(null);
    setOrderStatus({ message: null, error: null });
  };

  const placeOrder = async () => {
    if (!selectedMeal) return;
    if (!user || user.role !== "eater") {
      router.replace("/login?role=eater");
      return;
    }

    setOrdering(true);
    setOrderStatus({ message: null, error: null });

    const orderCode = `${Date.now().toString().slice(-6)}${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maker_id: selectedMeal.maker_id,
          order_code: orderCode,
          eater_name: eaterName,
          eater_id: user.id,
          meal_name: selectedMeal.title,
          image_data: selectedMeal.image_data,
          price: selectedMeal.price,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body?.detail
            ? typeof body.detail === "string"
              ? body.detail
              : JSON.stringify(body.detail)
            : "Unable to place order",
        );
      }

      setOrderStatus({
        message: `Order confirmed! Pickup code: ${body.order_code}`,
        error: null,
      });
      setTimeout(() => {
        setSelectedMeal(null);
        setSelectedMaker(null);
      }, 1200);
    } catch (err) {
      setOrderStatus({
        message: null,
        error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setOrdering(false);
    }
  };

  return (
    <main className="relative min-h-full overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-40 rounded-b-[3rem] bg-[radial-gradient(circle_at_top,_#f37460,_#ffdd86_45%,_transparent_90%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[2.5rem] bg-[radial-gradient(circle_at_bottom,_#fde0b6,_#f6a36b_60%,_transparent_100%)]" />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-32 pt-16">
        <header className="flex flex-col gap-2 text-white">
          <p className="text-sm font-medium uppercase tracking-wide">
            Choose your maker
          </p>
          <h1 className="text-3xl font-semibold drop-shadow-sm">Local listings</h1>
          <p className="text-sm text-white/80">
            Browse every maker on AussieEat, then tap in to see what they&#39;re serving today.
          </p>
        </header>

        <section className="mt-10 space-y-6">
          {error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          ) : loading ? (
            <p className="py-10 text-center text-sm font-semibold text-neutral-500">Loading makers…</p>
          ) : makers.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-neutral-500">
              No makers have listed meals yet. Check back soon!
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-5">
              {makers.map((maker) => (
                <button
                  key={maker.maker_id}
                  type="button"
                  onClick={() => openMaker(maker)}
                  className="rounded-3xl bg-white text-left shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f38f6b]/40"
                >
                  <div className="relative h-24 w-full overflow-hidden rounded-t-3xl">
                    {maker.featured_meal_image ? (
                      <Image
                        src={maker.featured_meal_image}
                        alt={maker.featured_meal_name ?? maker.name}
                        fill
                        sizes="160px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_#f99d90,_#ffd27a_70%)]">
                        <ChefHat className="size-8 text-white/90" aria-hidden />
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-neutral-700 shadow">
                      {maker.meal_count} {maker.meal_count === 1 ? "meal" : "meals"}
                    </span>
                  </div>
                  <div className="space-y-1 px-4 py-3 text-sm text-neutral-800">
                    <p className="font-semibold">{maker.name}</p>
                    <p className="flex items-center gap-1 text-xs text-neutral-500">
                      <MapPin className="size-3.5 text-[#f38f6b]" aria-hidden />
                      <span className="line-clamp-2">{maker.location}</span>
                    </p>
                    {maker.featured_meal_name ? (
                      <p className="text-xs font-medium text-[#f38f6b]">
                        Try: {maker.featured_meal_name}
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-neutral-400">No meals listed yet</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <nav className="mt-auto w-full pt-12">
          <div className="flex items-center justify-between rounded-[2.25rem] bg-[#f6a36b] px-6 py-4 text-neutral-900 shadow-[0_-8px_28px_rgba(243,152,118,0.25)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center text-xs font-semibold transition hover:text-white ${
                  item.href === "/eater/list" ? "text-white" : ""
                }`}
              >
                <item.icon className="mb-1 size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {selectedMaker ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">{selectedMaker.name}</h2>
                <p className="flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin className="size-3 text-[#f38f6b]" aria-hidden />
                  {selectedMaker.location}
                </p>
              </div>
              <button
                type="button"
                onClick={closeMaker}
                className="text-sm font-semibold text-[#f37460] hover:text-[#f05c45]"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-xs font-semibold text-neutral-500">
              {selectedMaker.meal_count} {selectedMaker.meal_count === 1 ? "meal" : "meals"} today
            </p>

            {mealError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {mealError}
              </p>
            ) : mealsLoading && !makerMeals[selectedMaker.maker_id] ? (
              <p className="mt-4 text-center text-sm font-semibold text-neutral-500">
                Loading menu…
              </p>
            ) : makerMeals[selectedMaker.maker_id]?.length ? (
              <div className="mt-5 grid grid-cols-1 gap-4">
                {makerMeals[selectedMaker.maker_id]?.map((meal) => (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => openMeal(meal)}
                    className="flex gap-3 rounded-3xl bg-neutral-50 p-3 text-left shadow-[0_10px_18px_rgba(0,0,0,0.08)] transition hover:-translate-y-1"
                  >
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl">
                      <Image
                        src={meal.image_data}
                        alt={meal.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex flex-1 flex-col justify-between text-sm text-neutral-800">
                      <div>
                        <p className="font-semibold">{meal.title}</p>
                        <p className="mt-1 text-xs text-neutral-500 line-clamp-2">
                          {meal.description}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-[#f37460]">
                        ${meal.price.toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-center text-sm font-semibold text-neutral-500">
                This maker hasn&#39;t uploaded any meals yet.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {selectedMeal ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-5">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-[0_35px_70px_rgba(0,0,0,0.45)]">
            <div className="relative h-44 w-full overflow-hidden rounded-2xl">
              <Image
                src={selectedMeal.image_data}
                alt={selectedMeal.title}
                fill
                sizes="320px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="mt-4 space-y-3 text-neutral-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{selectedMeal.title}</h2>
                <span className="rounded-full bg-[#fcdca7] px-3 py-1 text-sm font-semibold text-[#c26b2e]">
                  ${selectedMeal.price.toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-neutral-600">{selectedMeal.description}</p>
              <p className="text-xs text-neutral-400">
                Maker #{selectedMeal.maker_id} • curated for you
              </p>
            </div>

            {orderStatus.error ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                {orderStatus.error}
              </p>
            ) : null}
            {orderStatus.message ? (
              <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-600">
                {orderStatus.message}
              </p>
            ) : null}

            <div className="mt-5 flex gap-3">
              <Button
                variant="outline"
                onClick={closeMeal}
                className="h-12 flex-1 rounded-3xl border border-[#f2c9ae] text-sm font-semibold text-neutral-800"
                disabled={ordering}
              >
                Cancel
              </Button>
              <Button
                onClick={placeOrder}
                disabled={ordering}
                className="h-12 flex-1 rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-sm font-semibold text-neutral-900 shadow-[0_16px_30px_rgba(248,137,110,0.35)] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {ordering ? "Placing…" : "Order now"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

