import Link from "next/link";

type Props = {
  size?: number;
  withText?: boolean;
  href?: string | null;
};

/**
 * Brand mark — a stylized leaf with an emerald → amber gradient and a single
 * vein curl. Pairs with the "Fridge & Recipe" serif wordmark.
 */
export default function Logo({ size = 34, withText = true, href = "/" }: Props) {
  const content = (
    <span className="inline-flex items-center gap-2.5">
      <svg
        viewBox="0 0 36 36"
        width={size}
        height={size}
        aria-hidden="true"
        className="drop-shadow-sm"
      >
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%"  stopColor="#34c98a" />
            <stop offset="55%" stopColor="#22a06b" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="logoHighlight" x1="6" y1="6" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Leaf silhouette */}
        <path
          d="M18 3.5 C9.5 3.5 3.5 10 3.5 17.5 C3.5 25 9.5 32 18 32 C25 32 32.5 27.5 32.5 14 C32.5 7 26.5 3.5 18 3.5 Z"
          fill="url(#logoGrad)"
        />
        {/* Glossy highlight */}
        <path
          d="M9 8 C13 6 19 6 24 9 C20 8 14 9 9 8 Z"
          fill="url(#logoHighlight)"
        />
        {/* Leaf vein */}
        <path
          d="M11 24 C14 18 18 13 24 9"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
      </svg>

      {withText && (
        <span className="font-display text-lg font-bold tracking-tight text-stone-900 sm:text-xl">
          Fridge<span className="px-0.5 text-emerald-600">&amp;</span>Recipe
        </span>
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex items-center transition hover:opacity-90">
      {content}
    </Link>
  );
}
