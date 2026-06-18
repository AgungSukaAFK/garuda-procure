-- Tambah kolom 'description' (Catatan) pada tabel barang.
-- Halaman Tambah & Edit Barang menulis/membaca kolom ini, tapi tabel barang
-- belum memilikinya sehingga insert gagal:
--   "Could not find the 'description' column of 'barang' in the schema cache"
alter table public.barang add column if not exists description text;
