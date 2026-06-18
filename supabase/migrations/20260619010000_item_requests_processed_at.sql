-- Tambah kolom 'processed_at' pada item_requests. Halaman Permintaan Barang
-- (Purchasing) menulis kolom ini saat memproses/menolak pengajuan, tapi tabel
-- belum memilikinya:
--   "Could not find the 'processed_at' column of 'item_requests' in the schema cache"
alter table public.item_requests add column if not exists processed_at timestamptz;
