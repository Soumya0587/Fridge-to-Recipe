import { VISION_SYSTEM, VISION_USER, buildRecipePrompt } from "./prompts";

const token = process.env.HF_TOKEN;
if (!token) {
  console.warn("[hf] HF_TOKEN not set. Set it in .env.local");
}

// Try these vision models in order — different HF accounts have different
// providers enabled, so we fall through until one accepts the request.
const VISION_MODELS = [
  "Qwen/Qwen2.5-VL-7B-Instruct",
  "Qwen/Qwen2.5-VL-72B-Instruct",
  "meta-llama/Llama-3.2-11B-Vision-Instruct",
  "google/gemma-3-27b-it",
];

const RECIPE_MODEL = "Qwen/Qwen2.5-7B-Instruct";

// HF Inference Providers — OpenAI-compatible chat completions endpoint.
const HF_ROUTER = "https://router.huggingface.co/v1/chat/completions";
// Legacy HF Inference API — used as a fallback for image captioning (BLIP).
const HF_LEGACY = "https://api-inference.huggingface.co/models";

async function hfChat(body: Record<string, unknown>): Promise<any> {
  const res = await fetch(HF_ROUTER, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    // Surface the real HTTP status + body so we can actually debug.
    throw new Error(`HF ${res.status} ${res.statusText}: ${text.slice(0, 800)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`HF returned non-JSON: ${text.slice(0, 400)}`);
  }
}

export type Ingredient = {
  name: string;
  confidence: "high" | "medium" | "low";
  quantity_hint: string | null;
};

export type VisionResult = {
  ingredients: Ingredient[];
  notes: string;
  model: string;
};

/**
 * Stage 1: image → structured ingredient list.
 * Uses a VLM with a JSON-only system prompt.
 */
export async function detectIngredients(imageDataUrl: string): Promise<VisionResult> {
  const errors: string[] = [];

  // 1) Try each multimodal chat model — first one accepted wins.
  for (const model of VISION_MODELS) {
    console.log(`[hf.detectIngredients] trying vision model: ${model}`);
    try {
      const res = await hfChat({
        model,
        messages: [
          { role: "system", content: VISION_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: VISION_USER },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 600,
        temperature: 0.2,
      });
      const raw = res.choices?.[0]?.message?.content ?? "";
      const parsed = parseVisionJson(typeof raw === "string" ? raw : "");
      if (parsed.ingredients.length > 0) {
        console.log(`[hf.detectIngredients] ✅ SUCCESS with model: ${model} (${parsed.ingredients.length} ingredients)`);
        return { ...parsed, model };
      }
      errors.push(`${model}: parsed but returned no ingredients`);
      console.log(`[hf.detectIngredients] ⚠️  ${model}: returned no ingredients`);
    } catch (err: any) {
      errors.push(`${model}: ${err?.message?.slice(0, 200) || String(err)}`);
      console.log(`[hf.detectIngredients] ❌ ${model}: ${err?.message?.slice(0, 200)}`);
    }
  }

  // 2) Fallback: BLIP captioning via HF's own legacy inference (free, no providers).
  console.log("[hf.detectIngredients] falling back to BLIP captioning");
  try {
    const caption = await blipCaption(imageDataUrl);
    if (caption) {
      console.log(`[hf.detectIngredients] BLIP caption: "${caption}"`);
      const inferred = await inferIngredientsFromCaption(caption);
      if (inferred.ingredients.length > 0) {
        const blipModel = "Salesforce/blip-image-captioning-large (+ Qwen2.5-7B inference)";
        console.log(`[hf.detectIngredients] ✅ SUCCESS with fallback: ${blipModel}`);
        return { ...inferred, model: blipModel };
      }
      errors.push(`BLIP caption "${caption}" produced no ingredients`);
    }
  } catch (err: any) {
    errors.push(`BLIP fallback: ${err?.message?.slice(0, 200) || String(err)}`);
    console.log(`[hf.detectIngredients] ❌ BLIP fallback: ${err?.message?.slice(0, 200)}`);
  }

  console.error("[hf.detectIngredients] all attempts failed:\n" + errors.join("\n"));
  throw new Error(
    `No vision model accepted the request. Enable more Inference Providers in your HF account settings, or type ingredients manually. Details: ${errors[0] || "unknown"}`,
  );
}

/**
 * BLIP image captioning via HF's legacy (non-provider) inference API.
 * Returns a short description like "a refrigerator filled with vegetables and milk".
 */
async function blipCaption(imageDataUrl: string): Promise<string> {
  const match = imageDataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) throw new Error("invalid image data url");
  const buf = Buffer.from(match[2], "base64");

  const res = await fetch(`${HF_LEGACY}/Salesforce/blip-image-captioning-large`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: buf,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`BLIP ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  const caption: string = Array.isArray(json) ? json[0]?.generated_text : json?.generated_text;
  return (caption || "").trim();
}

/**
 * When we only have a short caption (no real ingredient enumeration), ask the
 * recipe LLM to guess likely ingredients from the scene description.
 */
async function inferIngredientsFromCaption(caption: string): Promise<Omit<VisionResult, "model">> {
  const res = await hfChat({
    model: RECIPE_MODEL,
    messages: [
      {
        role: "system",
        content: `${VISION_SYSTEM}\n\nYou are working from a short text description of a fridge interior (not the image itself). Make reasonable, common-sense guesses about what ingredients are likely present based on the description. Be conservative — only list items strongly implied by the description.`,
      },
      { role: "user", content: `Description of the fridge: "${caption}"\n\nReturn JSON only.` },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });
  const raw = res.choices?.[0]?.message?.content ?? "";
  const parsed = parseVisionJson(typeof raw === "string" ? raw : "");
  return { ...parsed, notes: `${parsed.notes} (inferred from caption: "${caption}")`.trim() };
}

/**
 * Stage 2: ingredients → recipe markdown.
 */
export async function generateRecipe(opts: {
  ingredients: string[];
  diet?: string;
  cuisine?: string;
  servings?: number;
  maxMinutes?: number;
}): Promise<string> {
  const { system, user } = buildRecipePrompt(opts);

  try {
    const res = await hfChat({
      model: RECIPE_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 900,
      temperature: 0.7,
    });

    return (res.choices?.[0]?.message?.content as string) ?? "";
  } catch (err: any) {
    console.error("[hf.generateRecipe] provider error:", err?.message);
    throw new Error(`Recipe model failed: ${err?.message || String(err)}`);
  }
}

/**
 * Robust JSON parser — VLMs occasionally wrap output in ```json fences or
 * add a leading sentence even when told not to.
 */
function parseVisionJson(raw: string): Omit<VisionResult, "model"> {
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.ingredients)) {
      return { ingredients: [], notes: "could not parse model output" };
    }
    return {
      ingredients: parsed.ingredients
        .filter((i: any) => i && typeof i.name === "string")
        .map((i: any) => ({
          name: i.name,
          confidence: ["high", "medium", "low"].includes(i.confidence) ? i.confidence : "medium",
          quantity_hint: typeof i.quantity_hint === "string" ? i.quantity_hint : null,
        })),
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return { ingredients: [], notes: "could not parse model output" };
  }
}
