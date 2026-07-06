-- ============================================================================
-- Cost Center Budget Deduction
--   Memotong budget Cost Center saat MR divalidasi GA, dan mengembalikannya
--   saat MR ditolak/dibatalkan.
--
--   Penanda di material_requests dipakai agar:
--     - tidak terjadi pemotongan ganda untuk MR yang sama
--     - pengembalian dana memakai jumlah & cost center yang persis dipotong
--       (aman walau cost_estimation / cost_center_id berubah setelahnya)
-- ============================================================================

-- 1) Kolom penanda pada material_requests ------------------------------------
alter table public.material_requests
  add column if not exists budget_deducted_amount numeric not null default 0;

alter table public.material_requests
  add column if not exists budget_deducted_cc_id bigint
    references public.cost_centers (id);

-- 2) RPC: potong budget cost center saat validasi ----------------------------
--    Raise 'INSUFFICIENT_BUDGET' bila saldo tidak cukup (ditangkap di client
--    untuk menampilkan popup). Idempoten: bila MR sudah pernah dipotong, abaikan.
create or replace function public.deduct_cost_center_budget(
  p_cost_center_id bigint,
  p_mr_id          bigint,
  p_amount         numeric,
  p_user_id        uuid,
  p_description    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev    numeric;
  v_already numeric;
begin
  -- Kunci baris MR & cek apakah sudah pernah dipotong
  select coalesce(budget_deducted_amount, 0) into v_already
  from public.material_requests
  where id = p_mr_id
  for update;

  if v_already > 0 then
    -- Sudah pernah dipotong untuk MR ini, jangan potong lagi.
    return;
  end if;

  -- Tidak ada nominal yang perlu dipotong.
  if coalesce(p_amount, 0) <= 0 then
    return;
  end if;

  -- Kunci baris cost center untuk mencegah race condition.
  select current_budget into v_prev
  from public.cost_centers
  where id = p_cost_center_id
  for update;

  if v_prev is null then
    raise exception 'COST_CENTER_NOT_FOUND';
  end if;

  if v_prev < p_amount then
    raise exception 'INSUFFICIENT_BUDGET';
  end if;

  update public.cost_centers
  set current_budget = v_prev - p_amount,
      updated_at = now()
  where id = p_cost_center_id;

  insert into public.cost_center_history
    (cost_center_id, mr_id, user_id, change_amount,
     previous_budget, new_budget, description)
  values
    (p_cost_center_id, p_mr_id, p_user_id, -p_amount,
     v_prev, v_prev - p_amount, p_description);

  update public.material_requests
  set budget_deducted_amount = p_amount,
      budget_deducted_cc_id  = p_cost_center_id
  where id = p_mr_id;
end;
$$;

-- 3) RPC: kembalikan budget saat MR ditolak/dibatalkan -----------------------
--    Idempoten: hanya mengembalikan bila MR memang punya potongan aktif.
create or replace function public.refund_cost_center_budget(
  p_mr_id       bigint,
  p_user_id     uuid,
  p_description text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
  v_cc     bigint;
  v_prev   numeric;
begin
  select coalesce(budget_deducted_amount, 0), budget_deducted_cc_id
  into v_amount, v_cc
  from public.material_requests
  where id = p_mr_id
  for update;

  -- Tidak ada potongan aktif => tidak ada yang dikembalikan.
  if v_amount is null or v_amount <= 0 or v_cc is null then
    return;
  end if;

  select current_budget into v_prev
  from public.cost_centers
  where id = v_cc
  for update;

  if v_prev is null then
    -- Cost center sudah terhapus; cukup reset penanda di MR.
    update public.material_requests
    set budget_deducted_amount = 0,
        budget_deducted_cc_id  = null
    where id = p_mr_id;
    return;
  end if;

  update public.cost_centers
  set current_budget = v_prev + v_amount,
      updated_at = now()
  where id = v_cc;

  insert into public.cost_center_history
    (cost_center_id, mr_id, user_id, change_amount,
     previous_budget, new_budget, description)
  values
    (v_cc, p_mr_id, p_user_id, v_amount,
     v_prev, v_prev + v_amount, p_description);

  update public.material_requests
  set budget_deducted_amount = 0,
      budget_deducted_cc_id  = null
  where id = p_mr_id;
end;
$$;
