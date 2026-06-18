-- ============================================================================
-- GarudaProcure — Skema awal (rekonstruksi dari kode aplikasi)
-- ----------------------------------------------------------------------------
-- Dibuat ulang dari type/index.ts + query di services/ agar cocok dengan web.
-- Mencakup: tabel, view users_with_profiles, trigger pembuat profile,
-- RLS, RPC, dan storage bucket (mr, po).
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1) PROFILES  (1:1 dengan auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text,
  lokasi      text,
  department  text,
  nama        text,
  nrp         text,
  company     text,
  email       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_profiles_is_active on public.profiles (is_active);
create index if not exists idx_profiles_nrp on public.profiles (nrp);

-- Trigger: setiap user baru di auth.users -> buat baris profiles (id + email).
-- Field lain (nama, nrp, company, role, department) diisi via halaman profil /
-- user-management (sesuai alur aplikasi: signup hanya email+password).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 2) MASTER: barang, vendors, cost_centers
-- ============================================================================
create table if not exists public.barang (
  id                   bigint generated always as identity primary key,
  part_number          text not null unique,
  part_name            text,
  category             text,
  uom                  text,
  vendor               text,
  is_asset             boolean not null default false,
  last_purchase_price  numeric,
  link                 text,
  description          text,
  created_at           timestamptz not null default now()
);

create table if not exists public.vendors (
  id                 bigint generated always as identity primary key,
  kode_vendor        text not null unique,
  nama_vendor        text not null,
  pic_contact_person text,
  alamat             text,
  email              text,
  created_at         timestamptz not null default now()
);

create table if not exists public.cost_centers (
  id             bigint generated always as identity primary key,
  name           text not null,
  code           text,
  company_code   text not null,
  initial_budget numeric not null default 0,
  current_budget numeric not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

create index if not exists idx_cost_centers_is_active on public.cost_centers (is_active);

-- ============================================================================
-- 3) MATERIAL REQUESTS
--    Catatan: FK ke profiles WAJIB bernama fk_material_requests_profiles
--    karena aplikasi memakai hint eksplisit:
--    users_with_profiles:profiles!fk_material_requests_profiles
-- ============================================================================
create table if not exists public.material_requests (
  id              bigint generated always as identity primary key,
  userid          uuid not null,
  kode_mr         text not null unique,
  kategori        text,
  status          text,
  remarks         text,
  cost_estimation text,
  department      text,
  company_code    text,
  tujuan_site     text,
  cost_center_id  bigint references public.cost_centers (id),
  prioritas       text,
  level           text,
  orders          jsonb not null default '[]'::jsonb,
  approvals       jsonb not null default '[]'::jsonb,
  attachments     jsonb not null default '[]'::jsonb,
  discussions     jsonb not null default '[]'::jsonb,
  due_date        timestamptz,
  created_at      timestamptz not null default now(),
  constraint fk_material_requests_profiles
    foreign key (userid) references public.profiles (id)
);

create index if not exists idx_mr_userid on public.material_requests (userid);
create index if not exists idx_mr_company on public.material_requests (company_code);
create index if not exists idx_mr_cost_center on public.material_requests (cost_center_id);

-- ============================================================================
-- 4) PURCHASE ORDERS
-- ============================================================================
create table if not exists public.purchase_orders (
  id                  bigint generated always as identity primary key,
  kode_po             text not null unique,
  mr_id               bigint references public.material_requests (id),
  user_id             uuid references public.profiles (id),
  status              text,
  vendor_details      jsonb,
  items               jsonb not null default '[]'::jsonb,
  currency            text,
  discount            numeric,
  tax                 numeric,
  postage             numeric,
  total_price         numeric not null default 0,
  payment_term        text,
  shipping_address    text,
  company_code        text,
  notes               text,
  attachments         jsonb not null default '[]'::jsonb,
  approvals           jsonb not null default '[]'::jsonb,
  repeated_from_po_id bigint,
  pph_type            text,
  pph_rate            numeric,
  pph_amount          numeric,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_po_user on public.purchase_orders (user_id);
create index if not exists idx_po_mr on public.purchase_orders (mr_id);
create index if not exists idx_po_company on public.purchase_orders (company_code);

-- ============================================================================
-- 5) PETTY CASH REQUESTS
-- ============================================================================
create table if not exists public.petty_cash_requests (
  id                     bigint generated always as identity primary key,
  kode_pc                text not null unique,
  user_id                uuid references public.profiles (id),
  company_code           text,
  department             text,
  cost_center_id         bigint references public.cost_centers (id),
  type                   text,
  amount                 numeric not null default 0,
  actual_amount          numeric,
  purpose                text,
  status                 text,
  discussions            jsonb not null default '[]'::jsonb,
  approvals              jsonb not null default '[]'::jsonb,
  attachments            jsonb not null default '[]'::jsonb,
  settlement_attachments jsonb not null default '[]'::jsonb,
  needed_date            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_pc_user on public.petty_cash_requests (user_id);
create index if not exists idx_pc_company on public.petty_cash_requests (company_code);

-- ============================================================================
-- 6) COST CENTER HISTORY
-- ============================================================================
create table if not exists public.cost_center_history (
  id              bigint generated always as identity primary key,
  cost_center_id  bigint references public.cost_centers (id) on delete cascade,
  mr_id           bigint references public.material_requests (id),
  user_id         uuid references public.profiles (id),
  change_amount   numeric not null default 0,
  previous_budget numeric not null default 0,
  new_budget      numeric not null default 0,
  description     text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_cch_cost_center on public.cost_center_history (cost_center_id);

-- ============================================================================
-- 7) GA STOCKS  (dari ga-stock-setup.sql)
-- ============================================================================
create table if not exists public.ga_stocks (
  id           bigint generated always as identity primary key,
  barang_id    bigint not null references public.barang (id) on delete cascade,
  company_code text   not null,
  quantity     numeric not null default 0,
  location     text,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  updated_by   uuid references public.profiles (id),
  unique (barang_id, company_code)
);

create index if not exists idx_ga_stocks_barang on public.ga_stocks (barang_id);
create index if not exists idx_ga_stocks_company on public.ga_stocks (company_code);

-- ============================================================================
-- 8) NOTIFICATIONS  (dari notifications-setup.sql; resource_id = text)
-- ============================================================================
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  actor_id      uuid references public.profiles (id),
  type          text not null,
  title         text not null,
  message       text,
  link          text,
  resource_id   text,
  resource_type text,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id);

-- ============================================================================
-- 9) APPROVAL TEMPLATES (MR/PO & Petty Cash)
-- ============================================================================
create table if not exists public.approval_templates (
  id            bigint generated always as identity primary key,
  template_name text not null,
  description   text,
  approval_path jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.pc_approval_templates (
  id            bigint generated always as identity primary key,
  template_name text not null,
  description   text,
  approval_path jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- 10) ITEM REQUESTS (pengajuan barang baru)
-- ============================================================================
create table if not exists public.item_requests (
  id                bigint generated always as identity primary key,
  requester_id      uuid references public.profiles (id),
  proposed_name     text not null,
  proposed_category text,
  proposed_uom      text,
  description       text,
  status            text not null default 'pending',
  admin_notes       text,
  processed_by      uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);

-- ============================================================================
-- 11) ACTIVITY LOGS
-- ============================================================================
create table if not exists public.activity_logs (
  id            bigint generated always as identity primary key,
  user_id       uuid references public.profiles (id),
  action_type   text,
  resource_type text,
  resource_id   text,
  description   text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_activity_logs_resource
  on public.activity_logs (resource_type, resource_id);

-- ============================================================================
-- 12) COMMENTS (diskusi MR/PO)
-- ============================================================================
create table if not exists public.comments (
  id            bigint generated always as identity primary key,
  resource_id   text,
  resource_type text,
  user_id       uuid references public.profiles (id),
  content       text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_comments_resource
  on public.comments (resource_type, resource_id);

-- ============================================================================
-- 13) NOTES (komponen tutorial bawaan starter — minimal)
-- ============================================================================
create table if not exists public.notes (
  id         bigint generated always as identity primary key,
  title      text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 14) VIEW users_with_profiles  (profiles + email auth.users)
--     Dipakai sebagai embedded resource di banyak query PostgREST.
--     Mengekspos kolom id agar relasi ke profiles bisa diturunkan.
-- ============================================================================
create or replace view public.users_with_profiles as
  select
    p.id,
    p.role,
    p.lokasi,
    p.department,
    p.nama,
    p.nrp,
    p.company,
    p.is_active,
    p.created_at,
    coalesce(p.email, u.email) as email
  from public.profiles p
  join auth.users u on u.id = p.id;

-- ============================================================================
-- 15) RPC FUNCTIONS
-- ============================================================================

-- 15a) create_notifications (dari notifications-setup.sql) -------------------
create or replace function public.create_notifications(p_notifications jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_count integer;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  if p_notifications is null or jsonb_typeof(p_notifications) <> 'array' then
    return 0;
  end if;

  insert into public.notifications
    (user_id, actor_id, type, title, message, link,
     resource_id, resource_type, is_read)
  select
    (elem->>'user_id')::uuid,
    v_actor,
    elem->>'type',
    elem->>'title',
    nullif(elem->>'message', ''),
    elem->>'link',
    nullif(elem->>'resource_id', ''),
    nullif(elem->>'resource_type', ''),
    false
  from jsonb_array_elements(p_notifications) as elem
  where coalesce(elem->>'user_id', '') <> ''
    and (elem->>'user_id')::uuid <> v_actor;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 15b) admin_update_budget ---------------------------------------------------
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
    (p_cost_center_id, p_admin_user_id, p_new_budget - coalesce(v_prev, 0),
     coalesce(v_prev, 0), p_new_budget, p_description);
end;
$$;

-- 15c) get_monthly_mr_po_trend ----------------------------------------------
--      Return: name (label bulan), jumlah_mr, jumlah_po
create or replace function public.get_monthly_mr_po_trend(
  p_company_code text,
  p_start_date   text,
  p_end_date     text
)
returns table (name text, jumlah_mr bigint, jumlah_po bigint)
language sql
stable
as $$
  with months as (
    select generate_series(
             date_trunc('month', p_start_date::timestamptz),
             date_trunc('month', p_end_date::timestamptz),
             interval '1 month'
           ) as m
  ),
  mr as (
    select date_trunc('month', created_at) as m, count(*) as c
    from public.material_requests
    where created_at >= p_start_date::timestamptz
      and created_at <  (p_end_date::timestamptz + interval '1 day')
      and (p_company_code = 'LOURDES' or company_code = p_company_code)
    group by 1
  ),
  po as (
    select date_trunc('month', created_at) as m, count(*) as c
    from public.purchase_orders
    where created_at >= p_start_date::timestamptz
      and created_at <  (p_end_date::timestamptz + interval '1 day')
      and (p_company_code = 'LOURDES' or company_code = p_company_code)
    group by 1
  )
  select to_char(months.m, 'Mon YYYY') as name,
         coalesce(mr.c, 0) as jumlah_mr,
         coalesce(po.c, 0) as jumlah_po
  from months
  left join mr on mr.m = months.m
  left join po on po.m = months.m
  order by months.m;
$$;

-- 15d) get_mr_distribution_by_dept ------------------------------------------
--      Return: department, total
create or replace function public.get_mr_distribution_by_dept(
  p_company_code text,
  p_start_date   text,
  p_end_date     text
)
returns table (department text, total bigint)
language sql
stable
as $$
  select coalesce(department, '(tanpa dept)') as department,
         count(*) as total
  from public.material_requests
  where created_at >= p_start_date::timestamptz
    and created_at <  (p_end_date::timestamptz + interval '1 day')
    and (p_company_code = 'LOURDES' or company_code = p_company_code)
  group by department
  order by total desc;
$$;

-- Grants untuk RPC ----------------------------------------------------------
revoke all on function public.create_notifications(jsonb) from public;
grant execute on function public.create_notifications(jsonb) to authenticated;
grant execute on function public.admin_update_budget(bigint, numeric, uuid, text) to authenticated;
grant execute on function public.get_monthly_mr_po_trend(text, text, text) to authenticated;
grant execute on function public.get_mr_distribution_by_dept(text, text, text) to authenticated;

-- ============================================================================
-- 16) ROW LEVEL SECURITY
--     Pola sama seperti aplikasi: pembatasan peran di-gate di sisi app,
--     DB cukup mengizinkan user terautentikasi (kecuali notifications).
-- ============================================================================
do $$
declare
  t text;
  tables text[] := array[
    'profiles','barang','vendors','cost_centers','cost_center_history',
    'material_requests','purchase_orders','petty_cash_requests','ga_stocks',
    'approval_templates','pc_approval_templates','item_requests',
    'activity_logs','comments','notes'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "%s_all_authenticated" on public.%I;', t, t);
    execute format(
      'create policy "%s_all_authenticated" on public.%I
         for all to authenticated using (true) with check (true);', t, t);
  end loop;
end $$;

-- notifications: kebijakan khusus (lihat notifications-setup.sql) ------------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- TIDAK ada policy INSERT: notif hanya dibuat lewat create_notifications().

-- Realtime untuk notifications
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when others then null;
end $$;

-- ============================================================================
-- 17) STORAGE BUCKETS: mr, po (private; akses untuk user terautentikasi)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('mr', 'mr', false), ('po', 'po', false)
on conflict (id) do nothing;

drop policy if exists "storage_mr_po_authenticated" on storage.objects;
create policy "storage_mr_po_authenticated" on storage.objects
  for all to authenticated
  using (bucket_id in ('mr', 'po'))
  with check (bucket_id in ('mr', 'po'));
