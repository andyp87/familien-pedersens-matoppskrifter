-- ============================================================
-- Migrasjon 06: kommentarer + oppskrift-varianter
-- Kjøres i Supabase → SQL Editor. Additiv og trygg.
-- ============================================================

-- 1) Kommentarer under oppskrifter
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments readable by all authenticated"
  on public.comments for select to authenticated using (true);
create policy "comments insert own"
  on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "comments delete own"
  on public.comments for delete to authenticated using (user_id = auth.uid());

create index if not exists idx_comments_recipe on public.comments(recipe_id);

-- 2) Varianter: en oppskrift kan være en «2.0» av en annen.
--    Når noen ANDRE enn eier endrer en oppskrift, lages en kopi med
--    parent_recipe_id satt til originalen (håndteres i appen).
alter table public.recipes
  add column if not exists parent_recipe_id uuid references public.recipes(id) on delete set null;
