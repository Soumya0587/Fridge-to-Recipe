import { NextRequest, NextResponse } from "next/server";
import { detectIngredients, generateRecipe, type Ingredient } from "@/lib/hf";
import { saveRecipe } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!process.env.HF_TOKEN) {
    return NextResponse.json(
      { error: "HF_TOKEN not configured on the server" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("image") as File | null;
  const manualIngredients = (form.get("manualIngredients") as string)?.trim() || "";
  const diet = (form.get("diet") as string) || undefined;
  const cuisine = (form.get("cuisine") as string) || undefined;
  const servings = Number(form.get("servings") || 2);
  const maxMinutes = Number(form.get("maxMinutes") || 45);

  if (!file && !manualIngredients) {
    return NextResponse.json({ error: "Provide either an image or a list of ingredients" }, { status: 400 });
  }
  if (file && file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 });
  }

  try {
    let ingredients: Ingredient[] = [];
    let notes = "";
    let recipe = "";
    let visionModel: string | null = null;
    let imageBuffer: Buffer | null = null;
    let imageMime: string | null = null;

    if (manualIngredients && !file) {
      const names = manualIngredients.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      ingredients = names.map((name) => ({ name, confidence: "high" as const, quantity_hint: null }));
      notes = "ingredients provided manually";
      recipe = await generateRecipe({ ingredients: names, diet, cuisine, servings, maxMinutes });
      console.log(`[api/recipe] manual path → recipe model: Qwen/Qwen2.5-7B-Instruct`);
    } else {
      imageBuffer = Buffer.from(await file!.arrayBuffer());
      imageMime = file!.type || "image/jpeg";
      const dataUrl = `data:${imageMime};base64,${imageBuffer.toString("base64")}`;

      const vision = await detectIngredients(dataUrl);
      if (vision.ingredients.length === 0) {
        return NextResponse.json(
          {
            ingredients: [],
            notes: vision.notes,
            recipe: null,
            error: "No edible ingredients detected. Try a clearer photo, or type ingredients manually below.",
          },
          { status: 200 },
        );
      }
      const names = vision.ingredients.map((i) => i.name);
      ingredients = vision.ingredients;
      notes = vision.notes;
      visionModel = vision.model;
      recipe = await generateRecipe({ ingredients: names, diet, cuisine, servings, maxMinutes });
      console.log(`[api/recipe] vision model used: ${vision.model} · recipe model: Qwen/Qwen2.5-7B-Instruct`);
    }

    // Save to Supabase if user is signed in + DB is configured (silently no-ops otherwise).
    const saved = await saveRecipe({
      imageBuffer,
      imageMime,
      ingredients,
      recipeMarkdown: recipe,
      cuisine,
      diet,
      servings,
      maxMinutes,
    });

    return NextResponse.json({
      ingredients,
      notes,
      recipe,
      visionModel,
      recipeModel: "Qwen/Qwen2.5-7B-Instruct",
      savedRecipeId: saved?.id ?? null,
    });
  } catch (err: any) {
    console.error("[api/recipe] error", err);
    const msg = err?.message || "Unknown error";
    const isRateLimit = /rate|limit|429|quota/i.test(msg);
    return NextResponse.json(
      {
        error: isRateLimit
          ? "Hugging Face rate limit hit. Wait a minute and try again, or upgrade your HF plan."
          : `Generation failed: ${msg}`,
      },
      { status: 500 },
    );
  }
}
