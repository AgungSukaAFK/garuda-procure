-- Data Goods Receipt (oleh GA) dan BAST (oleh Requester) per Purchase Order.
-- Disimpan sebagai JSONB: berisi checklist item yang diterima + tanda tangan.
-- GR -> ttd GA; BAST -> ttd GA (disalin dari GR) + ttd Requester.
alter table public.purchase_orders
  add column if not exists goods_receipt jsonb;
alter table public.purchase_orders
  add column if not exists bast jsonb;
