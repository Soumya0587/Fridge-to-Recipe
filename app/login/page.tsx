import { Suspense } from "react";
import LoginCard from "@/components/LoginCard";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Sign in · Fridge → Recipe",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pt-8 sm:px-8">
        <Logo href={null} />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center px-5 py-10 sm:px-8">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* Left — pitch */}
          <div className="space-y-6">
            <div className="badge-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              AI · Indian cuisine first
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl md:text-7xl">
              From <span className="bg-gradient-to-br from-emerald-600 via-lime-600 to-amber-600 bg-clip-text text-transparent">Fridge</span>
              <br /> to <span className="bg-gradient-to-br from-emerald-600 via-lime-600 to-amber-600 bg-clip-text text-transparent">Feast</span>
            </h1>
            <p className="max-w-md text-base text-stone-700">
              Snap a photo of your fridge. Our AI picks out the ingredients and writes you a real recipe — desi by default.
            </p>

            <ul className="space-y-3 text-sm text-stone-700">
              <Feature icon="📸">Upload a fridge photo — we'll spot what's inside</Feature>
              <Feature icon="🍛">Get authentic recipes tuned to your diet & time</Feature>
              <Feature icon="📚">Every recipe is saved to your private cookbook</Feature>
              <Feature icon="⚙️">Preferences remembered for next time</Feature>
            </ul>
          </div>

          {/* Right — sign-in card */}
          <div className="lg:pl-8">
            <Suspense fallback={<div className="glass rounded-3xl p-9"><div className="h-40 animate-pulse rounded-xl bg-emerald-50" /></div>}>
              <LoginCard />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}

function Feature({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="text-lg">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
