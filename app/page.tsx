"use client";

import { useRef, useState } from "react";

type Ingredient = { name: string; confidence: "high" | "medium" | "low"; quantity_hint: string | null };
type ApiResponse = {
  ingredients?: Ingredient[];
  notes?: string;
  recipe?: string | null;
  error?: string;
  visionModel?: string | null;
  recipeModel?: string;
};

const CUISINES = [
  "Indian",
  "North Indian",
  "South Indian",
  "Italian",
  "Mexican",
  "Chinese",
  "Thai",
  "Japanese",
  "Mediterranean",
  "American",
  "Middle Eastern",
];

const SAMPLE_DISHES = [
  { emoji: "🍛", name: "Paneer Bhurji", tag: "30 min · Easy" },
  { emoji: "🥘", name: "Aloo Gobi", tag: "35 min · Easy" },
  { emoji: "🍲", name: "Dal Tadka", tag: "25 min · Easy" },
  { emoji: "🥗", name: "Veg Pulao", tag: "40 min · Medium" },
];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [manualIngredients, setManualIngredients] = useState("");
  const [diet, setDiet] = useState("");
  const [cuisine, setCuisine] = useState("Indian");
  const [servings, setServings] = useState(2);
  const [maxMinutes, setMaxMinutes] = useState(45);
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(f: File | null) {
    setResult(null);
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  async function submit() {
    if (!file && !manualIngredients.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      if (file) fd.append("image", file);
      if (manualIngredients.trim()) fd.append("manualIngredients", manualIngredients);
      if (diet) fd.append("diet", diet);
      if (cuisine) fd.append("cuisine", cuisine);
      fd.append("servings", String(servings));
      fd.append("maxMinutes", String(maxMinutes));

      const res = await fetch("/api/recipe", { method: "POST", body: fd });
      const data: ApiResponse = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e?.message || "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  const hasResult = !!result && (result.recipe || result.error || (result.ingredients?.length ?? 0) > 0);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      {/* HEADER */}
      <header className="mb-10 sm:mb-14">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="badge-pill inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            AI · Indian cuisine first
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl md:text-7xl">
            From <span className="bg-gradient-to-br from-emerald-600 via-lime-600 to-amber-600 bg-clip-text text-transparent">Fridge</span>
            <br className="sm:hidden" /> to <span className="bg-gradient-to-br from-emerald-600 via-lime-600 to-amber-600 bg-clip-text text-transparent">Feast</span>
          </h1>
          <p className="max-w-xl text-base text-stone-700">
            Snap your fridge. Get a real, cookable recipe in seconds — desi by default, the world if you'd rather.
          </p>
        </div>
      </header>

      {/* TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.15fr]">
        {/* LEFT — controls (sticky on desktop) */}
        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          {/* Step 01 — Upload */}
          <section className="glass rounded-3xl p-6 sm:p-7">
            <StepHeader num="01" title="Show us your fridge" />

            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onPick(f);
              }}
              className="dropzone mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl px-6 py-10 text-center"
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="fridge preview" className="max-h-72 rounded-xl shadow-xl shadow-emerald-900/15" />
              ) : (
                <>
                  <div className="mb-3 text-4xl">🥬</div>
                  <div className="font-display text-lg font-semibold text-stone-900">Drop a fridge photo</div>
                  <div className="mt-1 text-xs text-stone-600">or click · JPG / PNG · up to 8MB</div>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </label>

            <div className="mt-5">
              <Field label="Or type ingredients">
                <textarea
                  value={manualIngredients}
                  onChange={(e) => setManualIngredients(e.target.value)}
                  placeholder="paneer, tomato, onion, ginger, coriander…"
                  rows={2}
                  className="input w-full rounded-xl px-4 py-3 text-sm"
                />
              </Field>
            </div>
          </section>

          {/* Step 02 — Preferences */}
          <section className="glass rounded-3xl p-6 sm:p-7">
            <StepHeader num="02" title="Tune your recipe" />

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Field label="Cuisine">
                <select
                  value={cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className="input w-full rounded-xl px-3 py-2.5 text-sm"
                >
                  {CUISINES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="Diet">
                <select
                  value={diet}
                  onChange={(e) => setDiet(e.target.value)}
                  className="input w-full rounded-xl px-3 py-2.5 text-sm"
                >
                  <option value="">No restriction</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="jain">Jain</option>
                  <option value="gluten-free">Gluten-free</option>
                  <option value="dairy-free">Dairy-free</option>
                  <option value="keto">Keto</option>
                  <option value="halal">Halal</option>
                </select>
              </Field>
              <Field label="Servings">
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={servings}
                  onChange={(e) => setServings(Number(e.target.value))}
                  className="input w-full rounded-xl px-3 py-2.5 text-sm"
                />
              </Field>
              <Field label="Max time (min)">
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={maxMinutes}
                  onChange={(e) => setMaxMinutes(Number(e.target.value))}
                  className="input w-full rounded-xl px-3 py-2.5 text-sm"
                />
              </Field>
            </div>

            <button
              onClick={submit}
              disabled={(!file && !manualIngredients.trim()) || loading}
              className="btn-primary mt-6 w-full rounded-xl px-4 py-3.5 text-sm"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white/90" />
                  Simmering your recipe…
                </span>
              ) : (
                "✨  Generate recipe"
              )}
            </button>
            {loading && (
              <>
                <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-emerald-100">
                  <div className="shimmer h-full w-full" />
                </div>
                <p className="mt-2 text-center text-xs text-stone-600">
                  First request can take 20–30s while the AI warms up.
                </p>
              </>
            )}
          </section>
        </div>

        {/* RIGHT — results or empty state */}
        <div className="space-y-6">
          {!hasResult && !loading && <EmptyState />}

          {loading && <LoadingState />}

          {result?.error && (
            <div className="glass rounded-3xl p-6">
              <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-4 text-sm text-rose-800">
                {result.error}
              </div>
            </div>
          )}

          {result?.ingredients && result.ingredients.length > 0 && (
            <section className="glass rounded-3xl p-6 sm:p-7">
              <StepHeader num="03" title="What we spotted" />
              <p className="mt-2 text-xs text-stone-600">
                Confidence-coded — <span className="text-emerald-700">high</span> · <span className="text-amber-700">medium</span> · <span className="text-stone-500">low</span>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.ingredients.map((ing, i) => (
                  <span
                    key={i}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      ing.confidence === "high"
                        ? "chip-high"
                        : ing.confidence === "medium"
                        ? "chip-medium"
                        : "chip-low"
                    }`}
                    title={ing.quantity_hint ?? undefined}
                  >
                    {ing.name}
                  </span>
                ))}
              </div>
              {result.notes && <p className="mt-4 text-xs italic text-stone-600">{result.notes}</p>}
              {(result.visionModel || result.recipeModel) && (
                <p className="mt-3 text-[10px] uppercase tracking-[0.15em] text-stone-500">
                  {result.visionModel && <>vision · <span className="text-emerald-700">{result.visionModel}</span> &nbsp; </>}
                  {result.recipeModel && <>recipe · <span className="text-emerald-700">{result.recipeModel}</span></>}
                </p>
              )}
            </section>
          )}

          {result?.recipe && (
            <section className="glass rounded-3xl p-6 sm:p-8">
              <StepHeader num="04" title="Your recipe" />
              <div className="divider-herb" />
              <RecipeMarkdown text={result.recipe} />
            </section>
          )}
        </div>
      </div>

      <footer className="mt-16 text-center text-[11px] text-stone-600">
        Made with Next.js, Hugging Face, and a pinch of garam masala.
      </footer>
    </main>
  );
}

function StepHeader({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="step-num">{num}</span>
      <h2 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-stone-700">{label}</span>
      {children}
    </label>
  );
}

function EmptyState() {
  return (
    <section className="glass rounded-3xl p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <span className="step-num">03</span>
        <h2 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">Your kitchen, ready when you are</h2>
      </div>
      <p className="mt-3 text-sm text-stone-700">
        Upload a fridge photo (or type a few ingredients) on the left. We'll pick out what's inside and write you a recipe like one of these:
      </p>
      <div className="divider-herb" />
      <div className="grid grid-cols-2 gap-3">
        {SAMPLE_DISHES.map((d) => (
          <div key={d.name} className="empty-tile flex items-center gap-3">
            <span className="text-2xl">{d.emoji}</span>
            <div>
              <div className="font-display text-sm font-semibold text-stone-900">{d.name}</div>
              <div className="text-[11px] text-stone-600">{d.tag}</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-stone-500">
        Tip · Indian cuisine selected — change anytime
      </p>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="glass rounded-3xl p-7 sm:p-9">
      <div className="flex items-center gap-3">
        <span className="step-num">···</span>
        <h2 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">Cooking…</h2>
      </div>
      <div className="divider-herb" />
      <div className="space-y-3">
        <div className="h-3 w-2/3 rounded-full bg-emerald-100 shimmer" />
        <div className="h-3 w-5/6 rounded-full bg-emerald-100 shimmer" />
        <div className="h-3 w-3/5 rounded-full bg-emerald-100 shimmer" />
        <div className="mt-6 h-3 w-1/2 rounded-full bg-amber-100 shimmer" />
        <div className="h-3 w-4/5 rounded-full bg-amber-100 shimmer" />
      </div>
      <p className="mt-6 text-xs text-stone-600">
        Tasting the spices · checking the ingredients · plating up…
      </p>
    </section>
  );
}

/**
 * Minimal markdown renderer — handles the fixed skeleton the recipe LLM is
 * prompted to produce (h1, h2, bold, lists, numbered steps).
 */
function RecipeMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (!listType || listBuf.length === 0) return;
    const Tag = listType;
    out.push(
      <Tag
        key={out.length}
        className={
          listType === "ol"
            ? "ml-5 list-decimal space-y-2 text-[15px] text-stone-900 marker:text-emerald-600 marker:font-bold"
            : "ml-5 list-disc space-y-1.5 text-[15px] text-stone-900 marker:text-emerald-600"
        }
      >
        {listBuf.map((l, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(l) }} />)}
      </Tag>,
    );
    listBuf = [];
    listType = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushList(); continue; }

    if (line.startsWith("# ")) {
      flushList();
      out.push(
        <h1 key={out.length} className="font-display text-3xl font-bold text-stone-900 sm:text-4xl">
          {line.slice(2)}
        </h1>,
      );
    } else if (line.startsWith("## ")) {
      flushList();
      out.push(
        <h2 key={out.length} className="font-display mt-6 text-xl font-semibold text-emerald-700">
          {line.slice(3)}
        </h2>,
      );
    } else if (/^\d+\.\s/.test(line)) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuf.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.startsWith("- ")) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuf.push(line.slice(2));
    } else {
      flushList();
      out.push(
        <p
          key={out.length}
          className="text-[15px] leading-relaxed text-stone-800"
          dangerouslySetInnerHTML={{ __html: inline(line) }}
        />,
      );
    }
  }
  flushList();
  return <article className="space-y-3">{out}</article>;
}

function inline(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong class=\"text-stone-900 font-semibold\">$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}
