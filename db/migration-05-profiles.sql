-- ============================================================
-- Migrasjon 05: brukerprofiler (visningsnavn + profilbilde)
-- Kjøres i Supabase → SQL Editor. Additiv og trygg.
-- Profilbilder lagres i den eksisterende recipe-images-bøtta under
-- avatars/<user_id> — ingen ny bøtte trengs.
-- ============================================================

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Alle innlogget kan LESE alle profiler (navn/bilde vises på oppskrifter).
create policy "profiles readable by all authenticated"
  on public.profiles for select to authenticated using (true);

-- Men hver bruker kan bare skrive sin egen profil.
create policy "profiles insert own"
  on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles update own"
  on public.profiles for update to authenticated using (user_id = auth.uid());
