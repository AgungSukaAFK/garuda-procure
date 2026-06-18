-- Izinkan pemilik mengganti gambar tanda tangan (image_url) saat edit.
-- Trigger lama mengunci image_url; sekarang yang dilindungi cukup kolom sensitif
-- (password_hash, user_id) dan printed_name (diambil dari profil, bukan diedit).
create or replace function public.protect_signature_columns()
returns trigger language plpgsql as $$
begin
  new.printed_name  := old.printed_name;
  new.password_hash := old.password_hash;
  new.user_id       := old.user_id;
  return new;
end $$;
