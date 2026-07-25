-- ============================================================
-- Migrasjon 03: private oppskrifter
-- Kjøres i Supabase → SQL Editor. KJØRES SAMMEN MED CLAUDE.
-- Etter kjøring: sjekk at appen fortsatt viser oppskrifter for alle,
-- og at en oppskrift merket privat kun vises for eieren.
-- ============================================================

-- 1) Flagg for privat (ikke delt) oppskrift. Standard: delt (false).
alter table public.recipes
  add column if not exists is_private boolean not null default false;

-- 2) Erstatt "alle innlogget kan lese alt" med en regel som skjuler private
--    oppskrifter for andre enn eieren. (Den gamle policyen het akkurat dette
--    – se migration-01. Hvis navnet er endret, dropp riktig policy manuelt.)
drop policy if exists "recipes readable by all authenticated" on public.recipes;
create policy "recipes readable if public or own"
  on public.recipes for select to authenticated
  using (is_private = false or user_id = auth.uid());

-- 3) Bilder til private oppskrifter skal også skjules for andre enn eier.
drop policy if exists "recipe_images readable by all authenticated" on public.recipe_images;
create policy "recipe_images readable if recipe visible"
  on public.recipe_images for select to authenticated
  using (exists (
    select 1 from public.recipes r
    where r.id = recipe_images.recipe_id
      and (r.is_private = false or r.user_id = auth.uid())
  ));
