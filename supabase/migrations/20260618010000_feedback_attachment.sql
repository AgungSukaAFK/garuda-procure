-- Tambah kolom lampiran untuk feedback. File diunggah ke storage bucket "mr"
-- (subfolder feedback/), kolom ini menyimpan public URL + nama asli file.
alter table public.feedbacks add column if not exists attachment_url  text;
alter table public.feedbacks add column if not exists attachment_name text;
