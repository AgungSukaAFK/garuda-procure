-- ============================================================================
-- Tabel feedback aplikasi.
-- Menggantikan alur lama yang mengirim feedback via email (SES) — sekarang
-- feedback disimpan ke DB dan dibaca admin lewat halaman Feedback Management.
-- ============================================================================
create table if not exists public.feedbacks (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users (id) on delete set null,
  nama        text,
  email       text,
  whatsapp    text,
  category    text not null,
  message     text not null,                         -- HTML dari editor
  status      text not null default 'baru',          -- baru | dibaca | selesai
  created_at  timestamptz not null default now()
);

create index if not exists idx_feedbacks_status  on public.feedbacks (status);
create index if not exists idx_feedbacks_created  on public.feedbacks (created_at desc);

-- RLS: mengikuti pola aplikasi (akses dikelola lapisan aplikasi).
alter table public.feedbacks enable row level security;
drop policy if exists "feedbacks_all_authenticated" on public.feedbacks;
create policy "feedbacks_all_authenticated" on public.feedbacks
  for all to authenticated using (true) with check (true);
