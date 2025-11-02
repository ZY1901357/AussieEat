"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Home as HomeIcon, ShoppingCart, Star, Store, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

type StoredUser = {
  id: number;
  email: string;
  role: string;
};

type ReviewSnippet = {
  review_id: number;
  rating: number;
  comment: string;
  reply: string | null;
};

type EaterOrder = {
  id: number;
  maker_id: number;
  eater_id: number | null;
  order_code: string;
  eater_name: string;
  meal_name: string;
  image_data: string;
  price: number;
  order_time: string;
  status: string;
  review: ReviewSnippet | null;
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

function formatTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  completed: "bg-neutral-100 text-neutral-600",
};

export default function EaterOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [orders, setOrders] = useState<EaterOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const [reviewOrder, setReviewOrder] = useState<EaterOrder | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string | null; error: string | null }>({
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

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/eater/orders?eater_id=${user.id}`);
      if (!response.ok) {
        throw new Error("Unable to load your orders");
      }
      const data = (await response.json()) as EaterOrder[];
      setOrders(data);
      setError(null);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== "completed"),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => order.status === "completed"),
    [orders]
  );

  const ordersToShow = activeTab === "active" ? activeOrders : completedOrders;

  const openReviewModal = (order: EaterOrder) => {
    setReviewOrder(order);
    setRating(order.review?.rating ?? 0);
    setComment(order.review?.comment ?? "");
    setSubmitting(false);
    setFeedback({ message: null, error: null });
  };

  const closeReviewModal = () => {
    if (submitting) return;
    setReviewOrder(null);
    setRating(0);
    setComment("");
    setFeedback({ message: null, error: null });
  };

  const submitReview = async () => {
    if (!reviewOrder) return;
    if (rating === 0) {
      setFeedback({ message: null, error: "Please select a rating." });
      return;
    }
    setSubmitting(true);
    setFeedback({ message: null, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: reviewOrder.id,
          rating,
          comment: comment.trim() || "No additional comments.",
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body?.detail
            ? typeof body.detail === "string"
              ? body.detail
              : JSON.stringify(body.detail)
            : "Unable to submit review"
        );
      }
      const reviewSnippet: ReviewSnippet = {
        review_id: body.id,
        rating: body.rating,
        comment: body.comment,
        reply: body.reply,
      };
      setOrders((prev) =>
        prev.map((order) =>
          order.id === reviewOrder.id ? { ...order, review: reviewSnippet } : order
        )
      );
      setFeedback({ message: "Thank you for your review!", error: null });
      setTimeout(() => {
        closeReviewModal();
      }, 1000);
    } catch (err) {
      setFeedback({
        message: null,
        error: err instanceof Error ? err.message : "Unable to submit review",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-full overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-40 rounded-b-[3rem] bg-[radial-gradient(circle_at_top,_#f37460,_#ffdd86_45%,_transparent_90%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[2.5rem] bg-[radial-gradient(circle_at_bottom,_#fde0b6,_#f6a36b_60%,_transparent_100%)]" />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-32 pt-16">
        <header className="flex flex-col gap-2 text-white">
          <p className="text-sm font-medium uppercase tracking-wide">Track your treats</p>
          <h1 className="text-3xl font-semibold drop-shadow-sm">Your orders</h1>
          <p className="text-sm text-white/80">
            Stay tuned for pickup updates and share your thoughts with makers.
          </p>
        </header>

        <section className="mt-10 space-y-5">
          <div className="flex rounded-full bg-white/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "active"
                  ? "bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-neutral-900 shadow"
                  : "bg-white text-[#f38f6b] border border-[#f7c8ac]/60"
              }`}
            >
              In progress
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "completed"
                  ? "bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-neutral-900 shadow"
                  : "bg-white text-[#f38f6b] border border-[#f7c8ac]/60"
              }`}
            >
              Completed
            </button>
          </div>

          {error ? (
            <p className="rounded-3xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </p>
          ) : loading ? (
            <p className="py-12 text-center text-sm font-semibold text-neutral-500">
              Loading your orders…
            </p>
          ) : ordersToShow.length === 0 ? (
            <p className="py-12 text-center text-sm font-semibold text-neutral-500">
              {activeTab === "active"
                ? "No active orders at the moment."
                : "No completed orders yet. Time to treat yourself!"}
            </p>
          ) : (
            <div className="space-y-4">
              {ordersToShow.map((order) => (
                <article
                  key={order.id}
                  className="rounded-3xl bg-white px-5 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex gap-3">
                    <div className="relative h-20 w-20 overflow-hidden rounded-2xl">
                      <Image
                        src={order.image_data}
                        alt={order.meal_name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 space-y-2 text-sm text-neutral-700">
                      <div className="flex items-center justify-between font-semibold text-neutral-900">
                        <span>{order.meal_name}</span>
                        <span>${order.price.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Order ID: <span className="font-medium">{order.order_code}</span>
                      </p>
                      <p className="text-xs text-neutral-500">
                        Time: <span className="font-medium">{formatTime(order.order_time)}</span>
                      </p>
                      <div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            statusColors[order.status] ?? "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {order.status === "completed" ? (
                    <div className="mt-4 space-y-3 rounded-2xl bg-neutral-50 px-4 py-3">
                      {order.review ? (
                        <>
                          <div className="flex items-center gap-1 text-[#f6ad3a]">
                            {Array.from({ length: 5 }, (_, idx) => (
                              <Star
                                key={idx}
                                className={`size-4 ${
                                  idx < order.review!.rating ? "fill-current" : "stroke-[#f6ad3a]"
                                }`}
                                strokeWidth={idx < order.review!.rating ? 0 : 1.5}
                              />
                            ))}
                          </div>
                          <p className="text-sm font-medium text-neutral-800">
                            {order.review.comment}
                          </p>
                          {order.review.reply ? (
                            <p className="rounded-2xl bg-white px-3 py-2 text-xs text-neutral-500">
                              Maker reply: {order.review.reply}
                            </p>
                          ) : null}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openReviewModal(order)}
                            className="h-9 rounded-3xl border border-[#f2c9ae] text-xs font-semibold text-neutral-700"
                          >
                            Edit review
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => openReviewModal(order)}
                          className="h-10 w-full rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-sm font-semibold text-neutral-900 shadow-[0_12px_20px_rgba(248,137,110,0.25)]"
                        >
                          Leave a review
                        </Button>
                      )}
                    </div>
                  ) : null}
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
                  item.href === "/eater/orders" ? "text-white" : ""
                }`}
              >
                <item.icon className="mb-1 size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {reviewOrder ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            <h2 className="text-lg font-semibold text-neutral-900">Share your taste</h2>
            <p className="text-sm text-neutral-500">
              How was <span className="font-semibold text-neutral-800">{reviewOrder.meal_name}</span>?
            </p>

            <div className="mt-4 flex items-center gap-2">
              {Array.from({ length: 5 }, (_, idx) => {
                const value = idx + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`flex size-9 items-center justify-center rounded-full border transition ${
                      rating >= value
                        ? "border-[#f6ad3a] bg-[#f6ad3a] text-white"
                        : "border-neutral-200 text-neutral-400 hover:border-[#f6ad3a]"
                    }`}
                  >
                    <Star
                      className="size-4"
                      fill={rating >= value ? "currentColor" : "none"}
                      stroke={rating >= value ? "currentColor" : "currentColor"}
                      strokeWidth={rating >= value ? 0 : 1.5}
                    />
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block space-y-2 text-sm font-medium text-neutral-700">
              <span>Comments</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                className="min-h-[96px] w-full resize-none rounded-2xl border border-[#f2c9ae] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#f38f6b] focus:ring-2 focus:ring-[#f38f6b]/30"
                placeholder="Tell others what you loved (or what could be better)."
              />
            </label>

            {feedback.error ? (
              <p className="mt-3 text-sm font-semibold text-red-500">{feedback.error}</p>
            ) : null}
            {feedback.message ? (
              <p className="mt-3 text-sm font-semibold text-emerald-600">{feedback.message}</p>
            ) : null}

            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={closeReviewModal}
                className="h-11 flex-1 rounded-3xl border border-[#f2c9ae] text-sm font-semibold text-neutral-800"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitReview}
                disabled={submitting}
                className="h-11 flex-1 rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-sm font-semibold text-neutral-900 shadow-[0_16px_30px_rgba(248,137,110,0.35)] disabled:cursor-not-allowed disabled:opacity-80"
              >
                {submitting ? "Submitting…" : "Submit review"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
