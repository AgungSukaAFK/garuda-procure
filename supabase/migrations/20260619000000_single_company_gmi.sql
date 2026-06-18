-- ============================================================================
-- Single-company GMI. Sistem hanya melayani satu perusahaan: PT Garuda Mart
-- Indonesia (GMI). Backfill semua nilai company ke 'GMI' dan jadikan default,
-- sehingga UI tidak perlu lagi meminta/ memfilter company. Kolom & RPC dibiarkan
-- (selalu 'GMI' -> cabang 'LOURDES' di RPC menjadi tidak berpengaruh).
-- ============================================================================

update public.profiles set company = 'GMI' where company is distinct from 'GMI';
alter table public.profiles alter column company set default 'GMI';

update public.material_requests set company_code = 'GMI'
  where company_code is distinct from 'GMI';
alter table public.material_requests alter column company_code set default 'GMI';

update public.purchase_orders set company_code = 'GMI'
  where company_code is distinct from 'GMI';
alter table public.purchase_orders alter column company_code set default 'GMI';

update public.petty_cash_requests set company_code = 'GMI'
  where company_code is distinct from 'GMI';
alter table public.petty_cash_requests alter column company_code set default 'GMI';

update public.cost_centers set company_code = 'GMI'
  where company_code is distinct from 'GMI';
alter table public.cost_centers alter column company_code set default 'GMI';

update public.ga_stocks set company_code = 'GMI'
  where company_code is distinct from 'GMI';
alter table public.ga_stocks alter column company_code set default 'GMI';
