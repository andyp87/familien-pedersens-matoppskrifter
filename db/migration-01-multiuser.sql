-- ============================================================
-- Migrasjon 01: enkeltbruker  →  delt pool + personlig kokebok
-- Kjøres i Supabase → SQL Editor. Additiv og idempotent.
-- Trygg å kjøre flere ganger.
-- ============================================================

-- 1) Kildehenvisning på oppskriften (lenke til original/video)
alter table public.recipes
  add column if not exists source_url text;

-- 2) recipes.user_id er allerede "forfatteren".
--    Vi ÅPNER lesing slik at alle innloggede ser hele den delte
--    poolen, mens kun forfatteren kan endre/slette.
--    (Ny permissiv SELECT-policy OR-es med evt. gammel, så «true» vinner.)
create policy "recipes readable by all authenticated"
  on public.recipes for select
  to authenticated
  using (true);

-- 3) Personlig kokebok: én rad per (bruker, oppskrift)
create table if not exists public.cookbook_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  recipe_id    uuid not null references public.recipes(id) on delete cascade,
  status       text not null default 'to_try'
               check (status in ('to_try','approved')),
  rating       int  check (rating between 1 and 10),
  cooked_count int  not null default 0,
  added_at     timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table public.cookbook_entries enable row level security;

-- Alle innlogget kan LESE alle bokføringer → felles topplister/snitt.
create policy "entries readable by all authenticated"
  on public.cookbook_entries for select to authenticated using (true);

-- Men kun eier kan skrive sine egne.
create policy "entries insert own"
  on public.cookbook_entries for insert to authenticated
  with check (user_id = auth.uid());
create policy "entries update own"
  on public.cookbook_entries for update to authenticated
  using (user_id = auth.uid());
create policy "entries delete own"
  on public.cookbook_entries for delete to authenticated
  using (user_id = auth.uid());

-- 4) Bilder må også kunne leses av alle (for delt pool)
create policy "recipe_images readable by all authenticated"
  on public.recipe_images for select to authenticated using (true);

-- 5) Backfill: alle eksisterende oppskrifter blir "approved" i
--    forfatterens egen kokebok og arver evt. cooked_count.
insert into public.cookbook_entries (user_id, recipe_id, status, cooked_count)
select user_id, id, 'approved', coalesce(cooked_count, 0)
from public.recipes
on conflict (user_id, recipe_id) do nothing;

-- 6) Fart: indekser
create index if not exists idx_entries_user   on public.cookbook_entries(user_id);
create index if not exists idx_entries_recipe on public.cookbook_entries(recipe_id);
