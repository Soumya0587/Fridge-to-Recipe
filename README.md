# Fridge → Recipe

Upload a photo of your fridge. Get a real, cookable recipe — powered by free Hugging Face Inference models and deployed on Vercel.

## Stack
- **Frontend + API**: Next.js 15 (App Router), TypeScript, Tailwind
- **Vision**: `meta-llama/Llama-3.2-11B-Vision-Instruct` via HF Inference (JSON-mode prompt)
- **Recipe LLM**: `mistralai/Mistral-7B-Instruct-v0.3` via HF Inference
- **Storage (optional)**: Supabase
- **Deploy**: Vercel

## Pipeline
1. User uploads a fridge photo → POST `/api/recipe`.
2. **Stage 1 (vision):** Llama-3.2 Vision reads the image with a strict JSON system prompt → returns `{ ingredients: [...], notes }`.
3. **Stage 2 (recipe):** Mistral takes the ingredient list + user constraints (diet, cuisine, servings, max time) → returns a recipe in a fixed markdown skeleton.
4. UI renders detected ingredients as confidence-colored chips and the recipe as styled markdown.

Prompts live in [lib/prompts.ts](lib/prompts.ts) — both stages use strict output contracts so parsing never relies on luck.

## Setup

```bash
npm install
cp .env.example .env.local   # then paste your HF_TOKEN
npm run dev
```

Get a free Hugging Face token at https://huggingface.co/settings/tokens (read scope is enough).

## Deploy to Vercel
1. Push this repo to GitHub.
2. Import into Vercel.
3. Add env var `HF_TOKEN` in Project Settings → Environment Variables.
4. Deploy.

## Optional: Supabase for saving recipes
Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then create a `recipes` table:

```sql
create table recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  image_url text,
  ingredients jsonb,
  recipe_markdown text,
  created_at timestamptz default now()
);
```

## Notes
- First HF call after idle takes 20–30s (cold start). Subsequent calls are fast.
- Free tier rate-limits — if you hit one, the API returns a clear error.
- To trade speed for quality, swap `RECIPE_MODEL` in [lib/hf.ts](lib/hf.ts) to `meta-llama/Llama-3.3-70B-Instruct`.
