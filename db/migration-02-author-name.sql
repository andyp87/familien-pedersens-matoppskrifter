-- ============================================================
-- Migrasjon 02: forfatternavn på oppskriften
-- Kjøres i Supabase → SQL Editor. Additiv og idempotent.
-- Nødvendig fordi anon-nøkkelen ikke kan lese auth.users på klienten,
-- så navnet denormaliseres inn på selve oppskriften.
-- ============================================================

alter table public.recipes add column if not exists author_name text;

update public.recipes r
set author_name = coalesce(
  nullif(split_part((select email from auth.users u where u.id = r.user_id), '@', 1), ''),
  'Ukjent'
)
where author_name is null;
