-- ============================================================
-- Migrasjon 04: kjøkken / nasjonalitet
-- Kjøres i Supabase → SQL Editor. Additiv og trygg.
-- Nye importer får kjøkken automatisk fra Claude. Eksisterende
-- oppskrifter kan fylles ut senere (backfill) eller i redigering.
-- ============================================================

alter table public.recipes
  add column if not exists cuisine text;
