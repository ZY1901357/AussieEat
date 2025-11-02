"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  Home,
  MessageSquare,
  Timer,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type StoredUser = {
  id: number;
  email: string;
  role: string;
};

type MakerOrder = {
  id: number;
  maker_id: number;
  order_code: string;
  eater_name: string;
  meal_name: string;
  image_data: string;
  price: number;
  order_time: string;
  status: string;
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

function formatTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MakerOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [orders, setOrders] = useState<MakerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ error: string | null; message: string | null }>({
    error: null,
    message: null,
  });

  useEffect(() => {
    setUser(loadStoredUser());
  }, []);

  useEffect(() => {
    if (user && user.role !== "maker") {
      router.replace("/login?role=maker");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/orders?maker_id=${user.id}`
        );
        if (!response.ok) {
          throw new Error("Unable to load orders");
        }
        const data = (await response.json()) as MakerOrder[];
        setOrders(data);
        setStatus({ error: null, message: null });
      } catch (error) {
        setStatus({
          error: error instanceof Error ? error.message : "Unable to load orders",
          message: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const headline = useMemo(() => {
    if (!user) return "Hi, Maker!";
    const name = user.email.split("@")[0];
    return `Hi, ${name}!`;
  }, [user]);

  const markAsCompleted = async (orderId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body?.detail
            ? typeof body.detail === "string"
              ? body.detail
              : JSON.stringify(body.detail)
            : "Unable to update order"
        );
      }
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? (body as MakerOrder) : order))
      );
      setStatus({ error: null, message: "Order marked as completed" });
    } catch (error) {
      setStatus({
        error: error instanceof Error ? error.message : "Unable to update order",
        message: null,
      });
    }
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
            <Timer className="size-6 text-[#f37460]" aria-hidden />
          </div>
        </header>

        <div className="mt-6 h-1 rounded-full bg-[linear-gradient(90deg,_#f79c79,_#f9c696)]" />

        <section className="mt-8 flex-1">
          <h2 className="text-lg font-semibold text-neutral-700">Orders List</h2>
          {status.error ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {status.error}
            </p>
          ) : null}
          {status.message ? (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
              {status.message}
            </p>
          ) : null}
          {loading ? (
            <p className="py-10 text-center text-sm font-semibold text-neutral-500">
              Loading orders…
            </p>
          ) : orders.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-neutral-500">
              No orders yet. You're all set for the next rush!
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="flex h-full flex-col rounded-3xl bg-white shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
                >
                  <div className="relative h-24 w-full overflow-hidden rounded-t-3xl">
                    <Image
                      src={order.image_data}
                      alt={order.meal_name}
                      fill
                      sizes="160px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-left">
                    <div className="flex items-center justify-between text-sm font-semibold text-neutral-900">
                      <span className="truncate">{order.meal_name}</span>
                      <span>${order.price.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-neutral-500">
                      <p className="truncate">
                        Order ID: <span className="font-medium">{order.order_code}</span>
                      </p>
                      <p>Order time: {formatTime(order.order_time)}</p>
                      <p>Customer: {order.eater_name}</p>
                    </div>
                    <div className="mt-auto">
                      <Button
                        type="button"
                        disabled={order.status === "completed"}
                        onClick={() => markAsCompleted(order.id)}
                        className="mt-2 h-10 w-full rounded-2xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-sm font-semibold text-neutral-900 shadow-[0_12px_20px_rgba(248,137,110,0.25)] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {order.status === "completed" ? "Completed" : "Mark as done"}
                      </Button>
                    </div>
                  </div>
                </article>
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
                  item.href === "/maker/orders" ? "text-white" : ""
                }`}
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
