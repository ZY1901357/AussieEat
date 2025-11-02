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

type MakerReview = {
  id: number;
  maker_id: number;
  order_code: string;
  eater_name: string;
  meal_name: string;
  image_data: string;
  rating: number;
  comment: string;
  reply: string | null;
  created_at: string;
  updated_at: string;
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

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MakerCommentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [reviews, setReviews] = useState<MakerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ error: string | null; message: string | null }>({
    error: null,
    message: null,
  });
  const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState<string>("");

  useEffect(() => {
    setUser(loadStoredUser());
  }, []);

  useEffect(() => {
    if (user && user.role !== "maker") {
      router.replace("/login?role=maker");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/reviews?maker_id=${user.id}`
        );
        if (!response.ok) {
          throw new Error("Unable to load reviews");
        }
        const data = (await response.json()) as MakerReview[];
        setReviews(data);
        setStatus({ error: null, message: null });
      } catch (error) {
        setStatus({
          error: error instanceof Error ? error.message : "Unable to load reviews",
          message: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [user]);

  const headline = useMemo(() => {
    if (!user) return "Hi, Maker!";
    const name = user.email.split("@")[0];
    return `Hi, ${name}!`;
  }, [user]);

  const openReply = (review: MakerReview) => {
    setActiveReplyId(review.id);
    setReplyDraft(review.reply ?? "");
  };

  const cancelReply = () => {
    setActiveReplyId(null);
    setReplyDraft("");
  };

  const submitReply = async (reviewId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyDraft }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body?.detail
            ? typeof body.detail === "string"
              ? body.detail
              : JSON.stringify(body.detail)
            : "Unable to send reply"
        );
      }
      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId ? (body as MakerReview) : review
        )
      );
      setStatus({ error: null, message: "Reply sent" });
      setActiveReplyId(null);
      setReplyDraft("");
    } catch (error) {
      setStatus({
        error: error instanceof Error ? error.message : "Unable to send reply",
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
            <MessageSquare className="size-6 text-[#f37460]" aria-hidden />
          </div>
        </header>

        <div className="mt-6 h-1 rounded-full bg-[linear-gradient(90deg,_#f79c79,_#f9c696)]" />

        <section className="mt-8 flex-1">
          <h2 className="text-lg font-semibold text-neutral-700">Meal reviews</h2>
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
              Loading reviews…
            </p>
          ) : reviews.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-neutral-500">
              No reviews yet. Keep delighting your eaters!
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {reviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-3xl bg-white px-4 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                      <Image
                        src={review.image_data}
                        alt={review.meal_name}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 space-y-1 text-sm text-neutral-700">
                      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        <span>{review.eater_name}</span>
                        <span>ID: {review.order_code}</span>
                      </div>
                      <p className="font-semibold text-neutral-900">
                        Rating:{" "}
                        <span className="text-[#f6ad3a]">
                          {"★".repeat(review.rating).padEnd(5, "☆")}
                        </span>
                      </p>
                      <p>
                        Comments:{" "}
                        <span className="font-medium text-neutral-800">
                          {review.comment}
                        </span>
                      </p>
                      <p className="text-xs text-neutral-400">
                        {formatDate(review.created_at)}
                      </p>
                      <div className="pt-2">
                        {activeReplyId === review.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={replyDraft}
                              onChange={(event) => setReplyDraft(event.target.value)}
                              placeholder="Write your reply..."
                              className="min-h-[72px] w-full resize-none rounded-2xl border border-[#f2c9ae] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#f38f6b] focus:ring-2 focus:ring-[#f38f6b]/30"
                            />
                            <div className="flex gap-3">
                              <Button
                                type="button"
                                onClick={() => submitReply(review.id)}
                                className="h-10 flex-1 rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-sm font-semibold text-neutral-900 shadow-[0_12px_20px_rgba(248,137,110,0.25)]"
                              >
                                Send
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={cancelReply}
                                className="h-10 flex-1 rounded-3xl border border-[#f2c9ae] text-sm font-semibold text-neutral-800"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openReply(review)}
                            className="w-full rounded-2xl border border-dashed border-[#f2c9ae] px-4 py-3 text-left text-sm font-semibold text-[#f38f6b] transition hover:bg-[#fef3ea]"
                          >
                            {review.reply
                              ? `Your reply: ${review.reply}`
                              : "Press here to reply ..."}
                          </button>
                        )}
                      </div>
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
                  item.href === "/maker/comments" ? "text-white" : ""
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
