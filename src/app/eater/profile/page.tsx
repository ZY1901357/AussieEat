"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Home as HomeIcon, ShoppingCart, Store, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";

type StoredUser = {
  id: number;
  email: string;
  role: string;
};

type EaterProfile = {
  display_name: string;
  phone: string | null;
  favorite_cuisine: string | null;
  note: string | null;
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

const defaultProfile: EaterProfile = {
  display_name: "Eater",
  phone: null,
  favorite_cuisine: null,
  note: null,
};

export default function EaterProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<EaterProfile>(defaultProfile);
  const [draft, setDraft] = useState<EaterProfile>(defaultProfile);
  const [status, setStatus] = useState<{ message: string | null; error: string | null }>({
    message: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setUser(loadStoredUser());
  }, []);

  useEffect(() => {
    if (user && user.role !== "eater") {
      router.replace("/login?role=eater");
    }
  }, [user, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/eater/profile?eater_id=${user.id}`
        );
        if (!response.ok) {
          throw new Error("Unable to load profile");
        }
        const data = (await response.json()) as EaterProfile;
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
          error: error instanceof Error ? error.message : "Unable to load profile",
        });
        setProfile(defaultProfile);
        setDraft(defaultProfile);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const email = user?.email ?? "eater@email.com";
  const headline = useMemo(() => profile.display_name || email.split("@")[0], [profile.display_name, email]);

  const handleChange = (field: keyof EaterProfile, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setStatus({ message: null, error: null });
    try {
      const response = await fetch(`${API_BASE_URL}/api/eater/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eater_id: user.id,
          display_name: draft.display_name,
          phone: draft.phone,
          favorite_cuisine: draft.favorite_cuisine,
          note: draft.note,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(
          body?.detail
            ? typeof body.detail === "string"
              ? body.detail
              : JSON.stringify(body.detail)
            : "Unable to update profile"
        );
      }
      setProfile(body as EaterProfile);
      setDraft(body as EaterProfile);
      setEditing(false);
      setStatus({ message: "Profile updated", error: null });
    } catch (error) {
      setStatus({
        message: null,
        error: error instanceof Error ? error.message : "Unable to update profile",
      });
    }
  };

  const cancelEdit = () => {
    setDraft(profile);
    setEditing(false);
  };

  return (
    <main className="relative min-h-full overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-40 rounded-b-[3rem] bg-[radial-gradient(circle_at_top,_#f37460,_#ffdd86_45%,_transparent_90%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[2.5rem] bg-[radial-gradient(circle_at_bottom,_#fde0b6,_#f6a36b_60%,_transparent_100%)]" />

      <div className="relative mx-auto flex min-h-full w-full max-w-sm flex-col px-6 pb-32 pt-16">
        <header className="flex flex-col items-center gap-4 text-white">
          <div className="flex size-28 items-center justify-center rounded-full border-4 border-white/80 bg-white/90 shadow-[0_12px_24px_rgba(243,138,110,0.28)]">
            <UserRound className="size-12 text-[#f37460]" aria-hidden />
          </div>
           <div className="text-center">
            <h1 className="text-2xl font-semibold text-white drop-shadow-sm">
              {headline}
            </h1>
            <p className="mt-1 text-sm font-medium text-white/80">
              Keep your preferences fresh
            </p>
          </div>
        </header>

        <section className="mt-10 flex-1 space-y-6">
          <div className="rounded-3xl bg-white px-5 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Account
            </p>
            <p className="mt-2 text-sm font-medium text-neutral-800">{email}</p>
            <p className="text-xs text-neutral-400">Email cannot be changed</p>
          </div>

          <div className="rounded-3xl bg-white px-5 py-4 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Preferences
            </p>
            {loading ? (
              <p className="mt-3 text-sm font-semibold text-neutral-500">
                Loading profile…
              </p>
            ) : (
              <div className="mt-3 space-y-4 text-sm text-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Name</span>
                  <span className="font-semibold text-neutral-800">{profile.display_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Phone</span>
                  <span className="font-medium">{profile.phone || "Add phone"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Favourite cuisine</span>
                  <span className="font-medium">
                    {profile.favorite_cuisine || "Let us know your favourite tastes"}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-neutral-500">Notes</span>
                  <span className="max-w-[60%] text-wrap font-medium">
                    {profile.note || "Add dietary preferences or delivery tips"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {status.error ? (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{status.error}</p>
          ) : null}
          {status.message ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600">
              {status.message}
            </p>
          ) : null}

          <Button
            onClick={() => setEditing(true)}
            className="h-12 w-full rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-base font-semibold text-neutral-900 shadow-[0_16px_30px_rgba(248,137,110,0.35)] hover:brightness-105 focus-visible:ring-[#f87664]/40"
          >
            Edit profile
          </Button>
        </section>

        <nav className="mt-auto w-full pt-12">
          <div className="flex items-center justify-between rounded-[2.25rem] bg-[#f6a36b] px-6 py-4 text-neutral-900 shadow-[0_-8px_28px_rgba(243,152,118,0.25)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center text-xs font-semibold transition hover:text-white ${
                  item.href === "/eater/profile" ? "text-white" : ""
                }`}
              >
                <item.icon className="mb-1 size-5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {editing ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-5">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-[0_25px_50px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900">Edit profile</h2>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-sm font-semibold text-[#f37460] transition hover:text-[#f05c45]"
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Display name</span>
                <Input
                  value={draft.display_name}
                  onChange={(event) => handleChange("display_name", event.target.value)}
                  placeholder="e.g. Alex"
                  required
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Phone</span>
                <Input
                  value={draft.phone ?? ""}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  placeholder="+61 400 000 000"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Favourite cuisine</span>
                <Input
                  value={draft.favorite_cuisine ?? ""}
                  onChange={(event) => handleChange("favorite_cuisine", event.target.value)}
                  placeholder="Thai, Japanese, Vegan…"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-neutral-700">
                <span>Additional note</span>
                <textarea
                  value={draft.note ?? ""}
                  onChange={(event) => handleChange("note", event.target.value)}
                  className="min-h-[96px] w-full resize-none rounded-2xl border border-[#f2c9ae] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#f38f6b] focus:ring-2 focus:ring-[#f38f6b]/30"
                  placeholder="Let makers know any allergies or pick-up preferences."
                />
              </label>

              <Button
                type="submit"
                className="h-12 w-full rounded-3xl bg-[linear-gradient(90deg,_#f87664,_#ffd67f)] text-base font-semibold text-neutral-900 shadow-[0_16px_30px_rgba(248,137,110,0.35)] hover:brightness-105 focus-visible:ring-[#f87664]/40"
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
