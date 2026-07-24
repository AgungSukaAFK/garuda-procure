-- ============================================================================
-- PERBAIKAN KEAMANAN — Persempit RLS yang tadinya "using (true)" di hampir
-- semua tabel (siapa pun yang login bisa baca/tulis baris siapa pun,
-- termasuk self-privilege-escalation lewat profiles.role, dan budget cost
-- center lewat RPC tanpa cek pemanggil).
--
-- Prinsip: RLS di sini menjaga ISOLASI (company/kepemilikan/approval chain)
-- sesuai aturan yang sudah dipakai di kode aplikasi (mrService.ts,
-- isGADepartment, dsb) — bukan mendikte alur bisnis persis kapan boleh
-- approve/reject (itu tetap tanggung jawab logic di halaman masing-masing).
-- ============================================================================

-- ---- Helper functions --------------------------------------------------
-- security definer supaya tidak recursive-lock saat dipakai di policy tabel
-- profiles itu sendiri (query di dalam function ini tidak kena RLS lagi).

create or replace function public.viewer_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.viewer_company() returns text
language sql stable security definer set search_path = public as $$
  select company from public.profiles where id = auth.uid();
$$;

create or replace function public.viewer_department() returns text
language sql stable security definer set search_path = public as $$
  select department from public.profiles where id = auth.uid();
$$;

-- Aturan visibilitas company yang sudah dipakai di mrService.ts: admin lihat
-- semua, company "LOURDES" lihat semua, company lain lihat company sendiri
-- (+ LOURDES, tapi itu tidak relevan di sisi "row LOURDES" karena row itu
-- sendiri company_code-nya = 'LOURDES').
create or replace function public.company_visible(row_company text) returns boolean
language sql stable as $$
  select
    public.viewer_role() = 'admin'
    or public.viewer_company() = 'LOURDES'
    or public.viewer_company() = row_company;
$$;

-- auth.uid() ada di salah satu entry approvals (pernah/akan jadi approver)?
create or replace function public.is_approval_party(approvals jsonb) returns boolean
language sql stable as $$
  select exists (
    select 1 from jsonb_array_elements(coalesce(approvals, '[]'::jsonb)) a
    where (a->>'userid')::uuid = auth.uid()
  );
$$;

-- Apakah sekarang giliran auth.uid() approve (semua entry sebelumnya di
-- array sudah "approved", entry milik auth.uid() masih "pending")? Meniru
-- isMyTurnForApproval di frontend (services/approvalService.ts).
create or replace function public.is_next_approver(approvals jsonb) returns boolean
language sql stable as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(approvals, '[]'::jsonb)) with ordinality as t(elem, idx)
    where (elem->>'userid')::uuid = auth.uid()
      and elem->>'status' = 'pending'
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(approvals, '[]'::jsonb)) with ordinality as t2(elem2, idx2)
        where idx2 < idx and elem2->>'status' <> 'approved'
      )
  );
$$;

-- ---- 1) PROFILES --------------------------------------------------------
-- Sebelumnya: siapa pun bisa update role/company/department dirinya sendiri
-- (atau orang lain) => self-privilege-escalation ke admin. Sekarang: baca
-- tetap luas (dipakai buat lookup nama/departemen di banyak tempat), tapi
-- TIDAK ADA policy insert/update/delete untuk role authenticated sama
-- sekali — satu-satunya jalan mengubah profil orang lain adalah RPC
-- admin_update_user_profile() di bawah (security definer, cek role admin
-- di dalam function, bukan di RLS).
drop policy if exists "profiles_all_authenticated" on public.profiles;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

-- Self-service terbatas: user boleh update BARIS SENDIRI, tapi hanya kolom
-- nama & lokasi (grant kolom Postgres, bukan cuma RLS — RLS saja tidak bisa
-- membatasi per-kolom, jadi tanpa revoke+grant ini "update baris sendiri"
-- tetap bisa dipakai buat ubah role/company/department/nrp sendiri).
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (nama, lokasi) on public.profiles to authenticated;

create or replace function public.admin_update_user_profile(
  p_user_id uuid,
  p_nama text default null,
  p_nrp text default null,
  p_company text default null,
  p_department text default null,
  p_role text default null,
  p_lokasi text default null,
  p_is_active boolean default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.viewer_role() is distinct from 'admin' then
    raise exception 'Hanya admin yang boleh mengubah profil pengguna.';
  end if;

  update public.profiles set
    nama       = coalesce(p_nama, nama),
    nrp        = coalesce(p_nrp, nrp),
    company    = coalesce(p_company, company),
    department = coalesce(p_department, department),
    role       = coalesce(p_role, role),
    lokasi     = coalesce(p_lokasi, lokasi),
    is_active  = coalesce(p_is_active, is_active)
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_update_user_profile(uuid,text,text,text,text,text,text,boolean) from public;
grant execute on function public.admin_update_user_profile(uuid,text,text,text,text,text,text,boolean) to authenticated;

-- Dipakai app/api/v1/signatures/verify/route.ts — lockout counter untuk
-- password signature. Sebelumnya route ini update profiles.is_active /
-- signature_failed_attempts langsung; setelah profiles dikunci di atas,
-- itu butuh RPC khusus yang cuma boleh mengubah BARIS PEMANGGIL SENDIRI
-- (bukan grant kolom umum, karena is_active tidak boleh bisa di-self-service
-- untuk kasus lain — cuma logic lockout ini yang butuh).
create or replace function public.record_signature_attempt(p_success boolean)
returns table (attempts int, locked boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_attempts int;
  v_locked boolean;
begin
  if p_success then
    update public.profiles set signature_failed_attempts = 0 where id = auth.uid();
    return query select 0, false;
  end if;

  update public.profiles
  set signature_failed_attempts = coalesce(signature_failed_attempts, 0) + 1
  where id = auth.uid()
  returning signature_failed_attempts into v_attempts;

  v_locked := v_attempts >= 5;
  if v_locked then
    update public.profiles set is_active = false where id = auth.uid();
  end if;

  return query select v_attempts, v_locked;
end;
$$;

revoke all on function public.record_signature_attempt(boolean) from public;
grant execute on function public.record_signature_attempt(boolean) to authenticated;

-- ---- 2) admin_update_budget RPC — tambah cek role + jangan percaya
--        p_admin_user_id yang dikirim caller (bisa dipalsukan) ------------
create or replace function public.admin_update_budget(
  p_cost_center_id bigint,
  p_new_budget     numeric,
  p_admin_user_id  uuid,
  p_description    text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev numeric;
begin
  if public.viewer_role() is distinct from 'admin' then
    raise exception 'Hanya admin yang boleh mengubah budget cost center.';
  end if;

  select current_budget into v_prev
  from public.cost_centers
  where id = p_cost_center_id
  for update;

  if not found then
    raise exception 'Cost center % not found', p_cost_center_id;
  end if;

  update public.cost_centers
  set current_budget = p_new_budget,
      initial_budget = greatest(initial_budget, p_new_budget),
      updated_at     = now()
  where id = p_cost_center_id;

  insert into public.cost_center_history
    (cost_center_id, user_id, change_amount, previous_budget, new_budget, description)
  values
    (p_cost_center_id, auth.uid(), p_new_budget - coalesce(v_prev, 0),
     coalesce(v_prev, 0), p_new_budget, p_description);
end;
$$;

-- ---- 3) MATERIAL_REQUESTS -----------------------------------------------
drop policy if exists "material_requests_all_authenticated" on public.material_requests;

create policy "mr_select" on public.material_requests
  for select to authenticated using (
    public.company_visible(company_code)
    or userid = auth.uid()
    or public.is_approval_party(approvals)
  );

create policy "mr_insert" on public.material_requests
  for insert to authenticated with check (userid = auth.uid());

create policy "mr_update" on public.material_requests
  for update to authenticated using (
    public.viewer_role() = 'admin'
    or userid = auth.uid()
    or public.is_approval_party(approvals)
    or (
      public.company_visible(company_code)
      and public.viewer_department() in ('General Affair', 'HRGA-HSE', 'Purchasing')
    )
  );

-- ---- 4) PURCHASE_ORDERS --------------------------------------------------
drop policy if exists "purchase_orders_all_authenticated" on public.purchase_orders;

create policy "po_select" on public.purchase_orders
  for select to authenticated using (
    public.company_visible(company_code)
    or user_id = auth.uid()
    or public.is_approval_party(approvals)
    or exists (
      select 1 from public.material_requests mr
      where mr.id = purchase_orders.mr_id and mr.userid = auth.uid()
    )
  );

create policy "po_insert" on public.purchase_orders
  for insert to authenticated with check (
    public.viewer_role() = 'admin' or public.company_visible(company_code)
  );

create policy "po_update" on public.purchase_orders
  for update to authenticated using (
    public.viewer_role() = 'admin'
    or user_id = auth.uid()
    or public.is_approval_party(approvals)
    or (
      public.company_visible(company_code)
      and public.viewer_department() in ('General Affair', 'HRGA-HSE', 'Purchasing')
    )
    or exists (
      select 1 from public.material_requests mr
      where mr.id = purchase_orders.mr_id and mr.userid = auth.uid()
    )
  );

-- ---- 5) PETTY_CASH_REQUESTS ----------------------------------------------
drop policy if exists "petty_cash_requests_all_authenticated" on public.petty_cash_requests;

create policy "pc_select" on public.petty_cash_requests
  for select to authenticated using (
    public.company_visible(company_code)
    or user_id = auth.uid()
    or public.is_approval_party(approvals)
  );

create policy "pc_insert" on public.petty_cash_requests
  for insert to authenticated with check (user_id = auth.uid());

create policy "pc_update" on public.petty_cash_requests
  for update to authenticated using (
    public.viewer_role() = 'admin'
    or user_id = auth.uid()
    or public.is_approval_party(approvals)
    or (
      public.company_visible(company_code)
      and public.viewer_department() in ('General Affair', 'HRGA-HSE', 'Finance')
    )
  );

-- ---- 6) COST_CENTERS / COST_CENTER_HISTORY -------------------------------
drop policy if exists "cost_centers_all_authenticated" on public.cost_centers;

create policy "cost_centers_select" on public.cost_centers
  for select to authenticated using (true);

create policy "cost_centers_insert_admin" on public.cost_centers
  for insert to authenticated with check (public.viewer_role() = 'admin');

create policy "cost_centers_update_admin" on public.cost_centers
  for update to authenticated using (public.viewer_role() = 'admin');

drop policy if exists "cost_center_history_all_authenticated" on public.cost_center_history;

create policy "cost_center_history_select" on public.cost_center_history
  for select to authenticated using (true);

create policy "cost_center_history_insert_admin" on public.cost_center_history
  for insert to authenticated with check (public.viewer_role() = 'admin');

-- ---- 7) VENDORS / BARANG -------------------------------------------------
drop policy if exists "vendors_all_authenticated" on public.vendors;

create policy "vendors_select" on public.vendors
  for select to authenticated using (true);

create policy "vendors_insert" on public.vendors
  for insert to authenticated with check (public.viewer_role() in ('admin', 'approver'));

create policy "vendors_update" on public.vendors
  for update to authenticated using (public.viewer_role() in ('admin', 'approver'));

create policy "vendors_delete" on public.vendors
  for delete to authenticated using (public.viewer_role() in ('admin', 'approver'));

drop policy if exists "barang_all_authenticated" on public.barang;

create policy "barang_select" on public.barang
  for select to authenticated using (true);

create policy "barang_insert" on public.barang
  for insert to authenticated with check (
    public.viewer_role() in ('admin', 'approver') or public.viewer_department() = 'Purchasing'
  );

create policy "barang_update" on public.barang
  for update to authenticated using (
    public.viewer_role() in ('admin', 'approver') or public.viewer_department() = 'Purchasing'
  );

create policy "barang_delete" on public.barang
  for delete to authenticated using (
    public.viewer_role() in ('admin', 'approver') or public.viewer_department() = 'Purchasing'
  );

-- ---- 8) GA_STOCKS ---------------------------------------------------------
drop policy if exists "ga_stocks_all_authenticated" on public.ga_stocks;

create policy "ga_stocks_select" on public.ga_stocks
  for select to authenticated using (true);

create policy "ga_stocks_insert" on public.ga_stocks
  for insert to authenticated with check (
    public.viewer_role() = 'admin' or public.viewer_department() in ('General Affair', 'HRGA-HSE')
  );

create policy "ga_stocks_update" on public.ga_stocks
  for update to authenticated using (
    public.viewer_role() = 'admin' or public.viewer_department() in ('General Affair', 'HRGA-HSE')
  );

create policy "ga_stocks_delete" on public.ga_stocks
  for delete to authenticated using (
    public.viewer_role() = 'admin' or public.viewer_department() in ('General Affair', 'HRGA-HSE')
  );

-- ---- 9) APPROVAL_TEMPLATES / PC_APPROVAL_TEMPLATES -----------------------
-- Catatan: tabel ini tidak punya kolom company_code, jadi scoping-nya cuma
-- berdasar role (admin/approver) — bukan per-company. Kalau nanti perlu
-- dipisah per company, harus tambah kolom company_code dulu.
drop policy if exists "approval_templates_all_authenticated" on public.approval_templates;

create policy "approval_templates_select" on public.approval_templates
  for select to authenticated using (true);

create policy "approval_templates_insert" on public.approval_templates
  for insert to authenticated with check (public.viewer_role() in ('admin', 'approver'));

create policy "approval_templates_update" on public.approval_templates
  for update to authenticated using (public.viewer_role() in ('admin', 'approver'));

create policy "approval_templates_delete" on public.approval_templates
  for delete to authenticated using (public.viewer_role() in ('admin', 'approver'));

drop policy if exists "pc_approval_templates_all_authenticated" on public.pc_approval_templates;

create policy "pc_approval_templates_select" on public.pc_approval_templates
  for select to authenticated using (true);

create policy "pc_approval_templates_insert" on public.pc_approval_templates
  for insert to authenticated with check (public.viewer_role() in ('admin', 'approver'));

create policy "pc_approval_templates_update" on public.pc_approval_templates
  for update to authenticated using (public.viewer_role() in ('admin', 'approver'));

create policy "pc_approval_templates_delete" on public.pc_approval_templates
  for delete to authenticated using (public.viewer_role() in ('admin', 'approver'));

-- ---- 10) ITEM_REQUESTS ----------------------------------------------------
drop policy if exists "item_requests_all_authenticated" on public.item_requests;

create policy "item_requests_select" on public.item_requests
  for select to authenticated using (true);

create policy "item_requests_insert" on public.item_requests
  for insert to authenticated with check (requester_id = auth.uid());

create policy "item_requests_update" on public.item_requests
  for update to authenticated using (
    public.viewer_role() = 'admin' or public.viewer_department() = 'Purchasing'
  );

-- ---- 11) ACTIVITY_LOGS / COMMENTS / NOTES --------------------------------
drop policy if exists "activity_logs_all_authenticated" on public.activity_logs;

create policy "activity_logs_select" on public.activity_logs
  for select to authenticated using (true);

create policy "activity_logs_insert" on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "comments_all_authenticated" on public.comments;

create policy "comments_select" on public.comments
  for select to authenticated using (true);

create policy "comments_insert" on public.comments
  for insert to authenticated with check (user_id = auth.uid());

create policy "comments_update_own" on public.comments
  for update to authenticated using (user_id = auth.uid());

create policy "comments_delete_own" on public.comments
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "notes_all_authenticated" on public.notes;

create policy "notes_select" on public.notes
  for select to authenticated using (true);

create policy "notes_insert" on public.notes
  for insert to authenticated with check (true);

-- ---- 12) FEEDBACKS (migrasi terpisah, policy lama sama terbukanya) ------
drop policy if exists "feedbacks_all_authenticated" on public.feedbacks;

create policy "feedbacks_select" on public.feedbacks
  for select to authenticated using (
    public.viewer_role() = 'admin' or user_id = auth.uid()
  );

create policy "feedbacks_insert" on public.feedbacks
  for insert to authenticated with check (user_id = auth.uid() or user_id is null);

create policy "feedbacks_update_admin" on public.feedbacks
  for update to authenticated using (public.viewer_role() = 'admin');
