import Link from "next/link";
import Logo from "@/components/Logo";
import { listMyRecipes, signedPhotoUrl, type SavedRecipe } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyRecipesPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return <EmptyShell title="Database not configured" body="Set the Supabase environment variables to enable recipe history." />;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return (
      <EmptyShell
        title="Sign in to see your recipes"
        body="Recipes you generate are saved automatically when you're signed in."
      />
    );
  }

  const recipes = await listMyRecipes();
  const withUrls = await Promise.all(
    recipes.map(async (r) => ({ ...r, photoUrl: r.image_path ? await signedPhotoUrl(r.image_path) : null })),
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="mb-10 flex items-center justify-between">
        <Logo />
        <Link href="/" className="rounded-full border border-emerald-700/30 bg-white/80 px-4 py-1.5 text-xs font-semibold text-emerald-800 shadow-sm transition hover:bg-white">
          ← New recipe
        </Link>
      </div>
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            My recipes
          </h1>
          <p className="mt-2 text-sm text-stone-700">
            {recipes.length === 0
              ? "No recipes yet — go cook something."
              : `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} saved.`}
          </p>
        </div>
      </header>

      {recipes.length === 0 ? (
        <Link href="/" className="glass empty-tile block rounded-3xl px-6 py-10 text-center transition hover:scale-[1.01]">
          <div className="text-3xl">🍳</div>
          <div className="font-display mt-3 text-lg font-semibold text-stone-900">Generate your first recipe</div>
          <div className="mt-1 text-xs text-stone-600">Snap your fridge or type ingredients on the home page.</div>
        </Link>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {withUrls.map((r) => (
            <RecipeCard key={r.id} recipe={r} photoUrl={r.photoUrl} />
          ))}
        </div>
      )}
    </main>
  );
}

function RecipeCard({ recipe, photoUrl }: { recipe: SavedRecipe; photoUrl: string | null }) {
  const title = extractTitle(recipe.recipe_markdown) || "Untitled recipe";
  const date = new Date(recipe.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="glass overflow-hidden rounded-3xl">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="fridge" className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50">
          <span className="text-4xl">🥘</span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-stone-500">
          <span>{date}</span>
          {recipe.cuisine && <span className="text-emerald-700">{recipe.cuisine}</span>}
        </div>
        <h3 className="font-display mt-2 line-clamp-2 text-lg font-semibold text-stone-900">{title}</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recipe.ingredients.slice(0, 4).map((ing, i) => (
            <span key={i} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800">
              {ing.name}
            </span>
          ))}
          {recipe.ingredients.length > 4 && (
            <span className="text-[10px] text-stone-500">+{recipe.ingredients.length - 4}</span>
          )}
        </div>
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-emerald-700 hover:text-emerald-900">
            View recipe
          </summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-[12px] text-stone-800">
{recipe.recipe_markdown}
          </pre>
        </details>
      </div>
    </article>
  );
}

function EmptyShell({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="glass rounded-3xl p-8 sm:p-10">
        <h1 className="font-display text-3xl font-bold text-stone-900">{title}</h1>
        <p className="mt-3 text-sm text-stone-700">{body}</p>
        <Link
          href="/"
          className="btn-primary mt-6 inline-block rounded-xl px-5 py-2.5 text-xs"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

function extractTitle(markdown: string): string | null {
  const m = markdown.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}
