"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginCard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const next = params.get("next") || "/";

  async function signInWithGoogle() {
    if (!isSupabaseConfigured()) {
      setError("Supabase isn't configured on this deployment.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e?.message || "Sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-3xl p-7 sm:p-9">
      <div className="mb-6 flex items-center gap-3">
        <span className="step-num">01</span>
        <h2 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">
          Sign in to get cooking
        </h2>
      </div>

      <p className="mb-6 text-sm text-stone-700">
        We use Google sign-in to keep your recipes and preferences private to you.
        Nothing else — no spam, no extra forms.
      </p>

      <button
        onClick={signInWithGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-5 py-3.5 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Redirecting to Google…
          </>
        ) : (
          <>
            <GoogleIcon /> Continue with Google
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      <div className="divider-herb" />

      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
        By signing in you agree to be cooked for by an AI.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.82.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
