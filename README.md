# 🥬 Fridge → Recipe

Snap a photo of your fridge. Get a real, cookable recipe — Indian cuisine by default, the world if you'd rather.

Powered by free Hugging Face Inference models, Supabase auth + storage, and deployed on Vercel.

---

## Features

- 📸 **Fridge → ingredients** — drop a fridge photo, AI vision detects every edible item
- ⌨️ **Or type it** — skip the photo, type ingredients manually
- 🍛 **Indian-first recipes** — defaults to authentic desi dishes; switch to Italian / Thai / Mexican / etc.
- 🥗 **Diet aware** — vegetarian, vegan, Jain, gluten-free, dairy-free, keto, halal
- 🔐 **Google sign-in** — private cookbook per user
- 📚 **Recipe history** — every generation auto-saved with the fridge photo it came from
- ⚙️ **Remembered preferences** — your cuisine/diet/servings persist across visits
- 🎨 **Aesthetic UI** — glass-morphism cards, blurred food backdrop, serif typography

---

## Stack

| Layer | Tech |
|---|---|
| Frontend + API | Next.js 16 (App Router), TypeScript, Tailwind v3 |
| Vision model | `Qwen/Qwen2.5-VL-7B-Instruct` (with 3-model fallback chain) via HF Inference Providers |
| Recipe LLM | `Qwen/Qwen2.5-7B-Instruct` via HF Inference Providers |
| Vision fallback | `Salesforce/blip-image-captioning-large` via HF Legacy Inference API |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase Postgres with RLS |
| File storage | Supabase Storage (`fridge-photos` bucket, signed URLs) |
| Deploy | Vercel |

---

## How the AI pipeline works

```
[ Fridge photo ]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1 — vision                                            │
│ Try Qwen2.5-VL-7B → Qwen2.5-VL-72B → Llama-3.2-Vision       │
│ → Gemma-3 → (fallback) BLIP captioning                      │
│ All called with a strict JSON-only system prompt.           │
└─────────────────────────────────────────────────────────────┘
       │  { ingredients: [...], notes, model }
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2 — recipe                                            │
│ Qwen2.5-7B with a fixed markdown skeleton:                  │
│   # Title  ·  Time/Servings  ·  ## Ingredients              │
│   ## Instructions  ·  ## Notes                              │
│ Indian-cuisine bias, diet enforcement, pantry-staple aware. │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3 — persist (if signed in)                            │
│ Upload photo to Supabase Storage → save recipe row →        │
│ update user preferences                                     │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
[ UI: ingredient chips · markdown recipe · model attribution ]
```

Prompts live in [`lib/prompts.ts`](lib/prompts.ts). Both stages use strict output contracts so parsing never relies on luck.

---

## Project structure

```
app/
  page.tsx                 — home: upload + recipe UI
  login/page.tsx           — Google sign-in page
  my-recipes/page.tsx      — saved recipe history
  auth/callback/route.ts   — OAuth callback handler
  api/recipe/route.ts      — main backend endpoint
  layout.tsx, globals.css  — theming, fonts, glass styles
components/
  Logo.tsx                 — SVG leaf brand mark
  AuthMenu.tsx             — sign-in / user menu (top right)
  LoginCard.tsx            — sign-in card on /login
lib/
  hf.ts                    — HF Inference client + model fallback chain
  prompts.ts               — vision + recipe prompt templates
  db.ts                    — save / list / preferences helpers
  supabase/client.ts       — browser Supabase client
  supabase/server.ts       — server Supabase client (cookies-aware)
middleware.ts              — auth gate (redirects to /login if signed out)
```

---

## Local setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Hugging Face token

Get a free token at https://huggingface.co/settings/tokens (with **"Make calls to Inference Providers"** permission). Paste into `.env.local`:

```env
HF_TOKEN=hf_xxx
```

To get the best vision model coverage, enable a free provider (Nebius, Together) at https://huggingface.co/settings/inference-providers.

### 3. Supabase (optional locally — required for auth/history)

- Create a project at https://supabase.com
- Settings → API: copy the **Project URL** and **publishable key**
- Paste into `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
```

Run this SQL in **Supabase → SQL Editor**:

```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  image_path text,
  ingredients jsonb not null,
  recipe_markdown text not null,
  cuisine text, diet text,
  servings int, max_minutes int,
  created_at timestamptz default now()
);
create index recipes_user_created_idx on public.recipes (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.recipes  enable row level security;

create policy "own profile read"   on public.profiles for select using (auth.uid() = id);
create policy "own profile write"  on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

create policy "own recipes read"   on public.recipes for select using (auth.uid() = user_id);
create policy "own recipes write"  on public.recipes for insert with check (auth.uid() = user_id);
create policy "own recipes delete" on public.recipes for delete using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin insert into public.profiles (id) values (new.id); return new; end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

Storage → New bucket → **`fridge-photos`** (private). Then in SQL Editor:

```sql
create policy "user uploads own folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'fridge-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "user reads own folder"
on storage.objects for select to authenticated
using (bucket_id = 'fridge-photos' and (storage.foldername(name))[1] = auth.uid()::text);
```

### 4. Google OAuth

- Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** → Web application
- **Authorized redirect URIs**: `https://<your-ref>.supabase.co/auth/v1/callback`
- Copy Client ID + Secret
- Supabase → Authentication → Providers → Google → enable, paste ID + Secret

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

If Supabase env vars are missing, the app runs in **anonymous mode** — no sign-in required, but recipes aren't saved. Useful for quick dev iteration.

---

## Deploy to Vercel

### Env vars

In **Vercel → Project Settings → Environment Variables** add:

| Key | Where it comes from |
|---|---|
| `HF_TOKEN` | Hugging Face settings |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |

Apply to **Production, Preview, Development**. Redeploy after adding.

### Supabase production URLs

Authentication → URL Configuration:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add both
  - `http://localhost:3000/auth/callback`
  - `https://your-app.vercel.app/auth/callback`

Google OAuth redirect URI does **not** change between local and production — it always points to Supabase.

---

## Notes & gotchas

- First HF call after idle takes 20–30s (cold start). Subsequent calls are fast.
- Free HF tier rate-limits — if you hit one, the API returns a clear `429` error.
- `HF 400 model_not_supported` means the model isn't on any inference provider your account has enabled. The fallback chain handles this automatically; to expand coverage enable Nebius or Together.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are interchangeable — Supabase renamed `anon` → `publishable`. The code accepts either name.
- Server logs for each request show which vision model handled it: `[hf.detectIngredients] ✅ SUCCESS with model: ...`

---

## License

MIT
