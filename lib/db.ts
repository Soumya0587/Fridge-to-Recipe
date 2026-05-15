import { createSupabaseServerClient } from "./supabase/server";
import type { Ingredient } from "./hf";

export type SavedRecipe = {
  id: string;
  user_id: string;
  image_path: string | null;
  ingredients: Ingredient[];
  recipe_markdown: string;
  cuisine: string | null;
  diet: string | null;
  servings: number | null;
  max_minutes: number | null;
  created_at: string;
};

export type UserPreferences = {
  cuisine?: string;
  diet?: string;
  servings?: number;
  maxMinutes?: number;
};

/**
 * Persist a generated recipe + optional fridge photo for the signed-in user.
 * Returns null silently if Supabase isn't configured or no user is signed in,
 * so the app keeps working as an anonymous tool when DB is off.
 */
export async function saveRecipe(opts: {
  imageBuffer: Buffer | null;
  imageMime: string | null;
  ingredients: Ingredient[];
  recipeMarkdown: string;
  cuisine?: string;
  diet?: string;
  servings?: number;
  maxMinutes?: number;
}): Promise<{ id: string } | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  let imagePath: string | null = null;

  // Upload photo (if provided) to the user's folder in the fridge-photos bucket.
  if (opts.imageBuffer && opts.imageMime) {
    const ext = opts.imageMime.split("/")[1] || "jpg";
    const filename = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("fridge-photos")
      .upload(filename, opts.imageBuffer, { contentType: opts.imageMime, upsert: false });

    if (!uploadErr) imagePath = filename;
    else console.warn("[db.saveRecipe] photo upload failed:", uploadErr.message);
  }

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: user.id,
      image_path: imagePath,
      ingredients: opts.ingredients,
      recipe_markdown: opts.recipeMarkdown,
      cuisine: opts.cuisine ?? null,
      diet: opts.diet ?? null,
      servings: opts.servings ?? null,
      max_minutes: opts.maxMinutes ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[db.saveRecipe] insert failed:", error.message);
    return null;
  }

  // Update preferences so next visit auto-fills these values.
  await supabase.from("profiles").upsert({
    id: user.id,
    preferences: {
      cuisine: opts.cuisine,
      diet: opts.diet,
      servings: opts.servings,
      maxMinutes: opts.maxMinutes,
    },
  });

  return { id: data.id };
}

export async function listMyRecipes(): Promise<SavedRecipe[]> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return [];

  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("[db.listMyRecipes] failed:", error.message);
    return [];
  }
  return (data as SavedRecipe[]) || [];
}

export async function getMyPreferences(): Promise<UserPreferences | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return (data.preferences as UserPreferences) || null;
}

/**
 * Generate a short-lived signed URL for a photo so we can render it
 * client-side without making the bucket public.
 */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data } = await supabase.storage.from("fridge-photos").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}
