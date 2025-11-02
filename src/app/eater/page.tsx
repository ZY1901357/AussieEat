"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Home as HomeIcon, ShoppingCart, Store, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export default function EaterHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [orderStatus, setOrderStatus] = useState<{ message: string | null; error: string | null }>({
    message: null,
    error: null,
  });

  useEffect(() => {
    setUser(loadStoredUser());
  }, []);

  useEffect(() => {
    if (user && user.role !== "eater") {
      router.replace("/login?role=eater");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchMeals = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/meals`);
        if (!response.ok) {
          throw new Error("Unable to load meals right now.");
        }
        const data = (await response.json()) as Meal[];
        setMeals(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load meals");
      } finally {
        setLoading(false);
      }
    };

    fetchMeals();
  }, []);

  const greeting = useMemo(() => {
    if (!user) return "Welcome back!";
    const name = user.email.split("@")[0];
    return `Welcome back, ${name}!`;
  }, [user]);

  const featuredMeals = meals.slice(0, 4);
  const todaySpecial = meals.length > 0 ? meals[0] : null;

  const eaterName =
    user?.email?.split("@")[0]?.replace(/\W+/g, " ")?.trim() || "Eater";

  const openMealModal = (meal: Meal) => {
    setOrderStatus({ message: null, error: null });
    setSelectedMeal(meal);
  };

  const closeMealModal = () => {
    if (ordering) return;
    setSelectedMeal(null);
  };

  const placeOrder = async () => {
    if (!selectedMeal || !user || user.role !== "eater") {
      if (user && user.role !== "eater") {
        router.replace("/login?role=eater");
      }
      setOrderStatus({
        error: "Please sign in as an eater to reserve a meal.",
        message: null,
      });
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
            : "Unable to place order"
        );
      }

      setOrderStatus({
        message: `Order confirmed! Your pickup code: ${body.order_code}`,
        error: null,
      });
      setTimeout(() => {
        setSelectedMeal(null);
      }, 1200);
    } catch (err) {
      setOrderStatus({
        error:
          err instanceof Error ? err.message : "Something went wrong. Please try again.",
        message: null,
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
        <header className="flex flex-col gap-4 text-white">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide">
              Discover nearby delights
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-white drop-shadow-sm">
              {greeting}
            </h1>
          </div>
          <div className="rounded-3xl bg-white/20 px-4 py-3 backdrop-blur-sm">
            <p className="text-sm font-medium text-white/90">
              Blind box deals on surplus meals from local makers
            </p>
            <p className="text-xs text-white/70">
              Enjoy something new today at a friendly price.
            </p>
          </div>
        </header>

        <section className="mt-10 space-y-6">
          {todaySpecial ? (
            <button
              type="button"
              onClick={() => openMealModal(todaySpecial)}
              className="rounded-3xl bg-white text-left shadow-[0_16px_32px_rgba(0,0,0,0.1)] transition hover:-translate-y-1"
            >
              <div className="relative h-44 w-full overflow-hidden rounded-t-3xl">
                <Image
                  src={todaySpecial.image_data}
                  alt={todaySpecial.title}
                  fill
                  sizes="320px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="space-y-3 px-5 py-4 text-neutral-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    Today's special · {todaySpecial.title}
                  </h2>
                  <span className="rounded-full bg-[#fcdca7] px-3 py-1 text-sm font-semibold text-[#c26b2e]">
                    ${todaySpecial.price.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-neutral-600">
                  {todaySpecial.description}
                </p>
              </div>
            </button>
          ) : (
            <div className="rounded-3xl bg-white/70 px-5 py-6 text-center text-sm font-medium text-neutral-500 shadow-inner">
              We're lining up delicious surprises near you...
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-neutral-800">
                Featured for you
              </h3>
              <Link
                href="/eater/list"
                className="text-xs font-semibold text-[#f38f6b] hover:text-[#f37460]"
              >
                See all
              </Link>
            </div>

            {error ? (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </p>
            ) : loading ? (
              <p className="py-6 text-center text-sm font-semibold text-neutral-500">
                Loading offers…
              </p>
            ) : featuredMeals.length === 0 ? (
              <p className="py-6 text-center text-sm font-semibold text-neutral-500">
                No featured meals right now. Check again soon!
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {featuredMeals.map((meal, index) => (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => openMealModal(meal)}
                    className="rounded-3xl bg-white text-left shadow-[0_12px_24px_rgba(0,0,0,0.08)] transition hover:-translate-y-1"
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
                    <div className="space-y-1 px-4 py-3 text-sm text-neutral-800">
                      <p className="font-semibold">{meal.title}</p>
                      <p className="text-xs text-neutral-500 line-clamp-2">
                        {meal.description}
                      </p>
                      <div className="flex items-center justify-between text-xs font-semibold text-[#f37460]">
                        <span>${meal.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <nav className="mt-auto w-full pt-12">
          <div className="flex items-center justify-between rounded-[2.25rem] bg-[#f6a36b] px-6 py-4 text-neutral-900 shadow-[0_-8px_28px_rgba(243,152,118,0.25)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center text-xs font-semibold transition hover:text-white ${
                  item.href === "/eater" ? "text-white" : ""
                }`}
              >
                <item.icon className="mb-1 size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {selectedMeal ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
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
                Prepared by Maker #{selectedMeal.maker_id}
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
                onClick={closeMealModal}
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
                {ordering ? "Placing..." : "Order now"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
