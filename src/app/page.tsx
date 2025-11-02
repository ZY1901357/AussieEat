import Link from "next/link";
import {
  ChefHat,
  Heart,
  Home as HomeIcon,
  ShoppingCart,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";

const roles = [
  {
    id: "eater",
    title: "Eater",
    blurb: "Are user who use Aussie Eat to buy food",
    accent: "from-[#f99d90] to-[#f37460]",
    Icon: UtensilsCrossed,
  },
  {
    id: "maker",
    title: "Maker",
    blurb: "Are user who use Aussie Eat to sell food",
    accent: "from-[#ffd27a] to-[#f9a46b]",
    Icon: ChefHat,
  },
] as const;

const navItems = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/orders", label: "Orders", icon: ShoppingCart },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export default function LandingPage() {
  return (
    <main className="relative flex min-h-full overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-24 rounded-b-[2rem] bg-[radial-gradient(circle_at_top,_#f37460,_#ffdd86_45%,_transparent_90%)]" />
      <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[2.5rem] bg-[radial-gradient(circle_at_bottom,_#f6a36b,_#f9c38b_45%,_transparent_100%)]" />

      <section className="relative mx-auto flex w-full max-w-sm flex-col px-6 pb-32 pt-24 text-center text-neutral-900">
        <header className="space-y-1">
          <p className="text-base font-semibold text-[#ff765b]">Welcome to</p>
          <h1 className="text-3xl font-bold text-[#f6af4e]">Aussie Eat</h1>
          <p className="pt-2 text-base font-medium text-neutral-700">
            Please pick your role
          </p>
        </header>

        <div className="mt-10 flex items-center justify-center gap-5">
          {roles.map((role, index) => (
            <div key={role.id} className="flex items-center gap-5">
              <Link
                href={`/login?role=${role.id}`}
                className="group relative flex w-32 flex-col items-center gap-3 rounded-3xl border border-[#f2b395] bg-white/90 px-4 pb-5 pt-6 shadow-[0_12px_28px_rgba(249,148,115,0.18)] transition-transform duration-200 hover:-translate-y-1"
              >
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-b ${role.accent}`}
                >
                  <role.Icon className="size-10 text-white drop-shadow-[0_6px_10px_rgba(0,0,0,0.1)]" />
                </div>
                <p className="text-sm font-semibold text-neutral-900">
                  {role.title}
                </p>
              </Link>
              {index === 0 && (
                <span className="text-sm font-semibold text-[#f38f6b]">OR</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-11 h-1 rounded-full bg-[linear-gradient(90deg,_#f79c79,_#f9c696)]" />

        <div className="mt-8 space-y-6 text-left text-sm leading-relaxed text-neutral-700">
          {roles.map((role) => (
            <div key={role.id}>
              <p className="font-semibold text-neutral-900">{role.title}</p>
              <p>{role.blurb}</p>
            </div>
          ))}
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
      </section>
    </main>
  );
}
