"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type UserSummary = { email: string | null; avatarUrl: string | null };

export default function AuthMenu() {
  const [configured] = useState(isSupabaseConfigured());
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email ?? null,
          avatarUrl: (data.user.user_metadata?.avatar_url as string) ?? null,
        });
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email ?? null,
          avatarUrl: (session.user.user_metadata?.avatar_url as string) ?? null,
        });
      } else {
        setUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  async function signInWithGoogle() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
  }

  if (!configured) return null;
  if (loading) return <div className="h-9 w-24 animate-pulse rounded-full bg-emerald-100/60" />;

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="inline-flex items-center gap-2 rounded-full border border-emerald-700/30 bg-white/80 px-4 py-2 text-xs font-semibold text-stone-800 shadow-sm transition hover:bg-white"
      >
        <GoogleIcon /> Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/my-recipes"
        className="rounded-full border border-emerald-700/30 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-white"
      >
        My recipes
      </Link>
      <div className="flex items-center gap-2 rounded-full border border-emerald-700/20 bg-white/70 px-2 py-1">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-emerald-200" />
        )}
        <span className="hidden text-xs text-stone-700 sm:inline">{user.email}</span>
        <button
          onClick={signOut}
          title="Sign out"
          className="rounded-full px-2 text-xs text-stone-500 hover:text-stone-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.82.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
