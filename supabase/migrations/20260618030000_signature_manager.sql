-- ============================================================================
-- Signature Manager: tanda tangan elektronik + verifikasi password sekunder.
-- Setiap user menyimpan beberapa gambar TTD (maks 6, dicek di server). Saat
-- approve dokumen, user memilih TTD + memasukkan password signature (bcrypt).
-- 5x salah -> akun terkunci (profiles.is_active=false).
-- ============================================================================

create table if not exists public.user_signatures (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  image_url     text not null,        -- public URL file di bucket 'signatures'
  printed_name  text not null,        -- diambil dari profiles.nama saat dibuat
  label         text not null,        -- nama panggilan TTD, mis. "TTD Formal"
  password_hash text not null,        -- bcrypt hash password signature (sekunder)
  is_hidden     boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_user_signatures_user on public.user_signatures (user_id);

-- RLS KETAT per-pemilik (pengecualian dari pola permisif tabel lain).
alter table public.user_signatures enable row level security;

drop policy if exists "user_signatures_select_own" on public.user_signatures;
create policy "user_signatures_select_own" on public.user_signatures
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_signatures_insert_own" on public.user_signatures;
create policy "user_signatures_insert_own" on public.user_signatures
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "user_signatures_update_own" on public.user_signatures;
create policy "user_signatures_update_own" on public.user_signatures
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_signatures_delete_own" on public.user_signatures;
create policy "user_signatures_delete_own" on public.user_signatures
  for delete to authenticated using (auth.uid() = user_id);

-- Lindungi kolom sensitif: UPDATE hanya boleh mengubah label & is_hidden.
-- image_url / printed_name / password_hash dipaksa tetap (nilai lama).
create or replace function public.protect_signature_columns()
returns trigger language plpgsql as $$
begin
  new.image_url     := old.image_url;
  new.printed_name  := old.printed_name;
  new.password_hash := old.password_hash;
  new.user_id       := old.user_id;
  return new;
end $$;

drop trigger if exists trg_protect_signature on public.user_signatures;
create trigger trg_protect_signature
  before update on public.user_signatures
  for each row execute function public.protect_signature_columns();

-- Penghitung gagal verifikasi (lockout). Flag terkunci pakai profiles.is_active.
alter table public.profiles
  add column if not exists signature_failed_attempts integer not null default 0;

-- ============================================================================
-- Storage bucket 'signatures'. Public READ (gambar TTD memang ditampilkan di
-- halaman verifikasi publik /approval-po/{id}); WRITE/DELETE tetap hanya pemilik
-- (policy folder = UUID). Yang rahasia (password_hash) ada di DB, bukan storage.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', true)
on conflict (id) do nothing;

drop policy if exists "signatures_own_folder" on storage.objects;
create policy "signatures_own_folder" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'signatures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
