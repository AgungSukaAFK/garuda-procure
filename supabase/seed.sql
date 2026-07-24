-- ============================================================================
-- SEED — Akun admin pertama (skema kosong, hanya 1 user admin)
-- ----------------------------------------------------------------------------
--   Email    : garudamart3@gmail.com
--   Password : Admin123!
--   Role     : admin   (nrp + company sudah diisi agar lolos middleware)
-- Ubah kredensial di bawah jika perlu.
-- ============================================================================

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email   text := 'garudamart3@gmail.com';
  v_pass    text := 'Admin123!';
begin
  -- Lewati bila user sudah ada (mis. seed dijalankan ulang)
  if exists (select 1 from auth.users where email = v_email) then
    return;
  end if;

  -- 1) auth.users
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, crypt(v_pass, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    false, '', '', '', ''
  );

  -- 2) auth.identities (wajib agar login email/password berfungsi)
  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id::text, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- 3) Lengkapi profil (baris profiles sudah dibuat trigger on_auth_user_created)
  update public.profiles
  set nama       = 'Administrator',
      nrp        = 'ADMIN001',
      company    = 'GMI',
      department = 'IT',
      role       = 'admin',
      is_active  = true,
      email      = v_email
  where id = v_user_id;
end $$;

-- ============================================================================
-- SEED — Akun demo untuk simulasi sidang
-- ----------------------------------------------------------------------------
--   Semua akun: password "demo1234", company "GMI", lokasi "Head Office".
--   Mencakup 16 departemen (lib/constants + type/comboboxData) dan ke-4 role
--   yang dipakai app (admin, approver, requester, user).
-- ============================================================================

do $$
declare
  v_user_id uuid;

  -- (email, password, nama, nrp, department, role)
  v_rows text[][] := array[
    array['admin.demo@demo.com',      'demo1234', 'Admin Demo',                 'DEMO001', 'IT',                  'admin'],
    array['ga.demo@demo.com',         'demo1234', 'GA Demo',                    'DEMO002', 'General Affair',      'approver'],
    array['hrgahse.demo@demo.com',    'demo1234', 'HRGA-HSE Demo',              'DEMO003', 'HRGA-HSE',            'approver'],
    array['finance.demo@demo.com',    'demo1234', 'Finance Demo',               'DEMO004', 'Finance',             'approver'],
    array['gm.demo@demo.com',         'demo1234', 'General Manager Demo',       'DEMO005', 'General Manager',     'approver'],
    array['em.demo@demo.com',         'demo1234', 'Executive Manager Demo',     'DEMO006', 'Executive Manager',   'approver'],
    array['bod.demo@demo.com',        'demo1234', 'Board of Director Demo',     'DEMO007', 'Boards of Director',  'approver'],
    array['legal.demo@demo.com',      'demo1234', 'Legal Demo',                 'DEMO008', 'Legal',               'approver'],
    array['hr.demo@demo.com',         'demo1234', 'HR Staff Demo',              'DEMO009', 'Human Resources',     'requester'],
    array['marketing.demo@demo.com',  'demo1234', 'Marketing Staff Demo',       'DEMO010', 'Marketing',           'requester'],
    array['produksi.demo@demo.com',   'demo1234', 'Produksi Staff Demo',        'DEMO011', 'Produksi',            'requester'],
    array['k3.demo@demo.com',         'demo1234', 'K3 Staff Demo',              'DEMO012', 'K3',                  'requester'],
    array['logistik.demo@demo.com',   'demo1234', 'Logistik Staff Demo',        'DEMO013', 'Logistik',            'requester'],
    array['warehouse.demo@demo.com',  'demo1234', 'Warehouse Staff Demo',       'DEMO014', 'Warehouse',           'requester'],
    array['service.demo@demo.com',    'demo1234', 'Service Staff Demo',         'DEMO015', 'Service',             'requester'],
    array['purchasing.demo@demo.com', 'demo1234', 'Purchasing Staff Demo',      'DEMO016', 'Purchasing',          'user']
  ];
  v_row text[];
begin
  foreach v_row slice 1 in array v_rows loop
    -- Lewati bila user sudah ada (mis. seed dijalankan ulang)
    if exists (select 1 from auth.users where email = v_row[1]) then
      continue;
    end if;

    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      v_row[1], crypt(v_row[2], gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      false, '', '', '', ''
    );

    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_row[1], 'email_verified', true),
      'email', now(), now(), now()
    );

    update public.profiles
    set nama       = v_row[3],
        nrp        = v_row[4],
        company    = 'GMI',
        department = v_row[5],
        role       = v_row[6],
        lokasi     = 'Head Office',
        is_active  = true,
        email      = v_row[1]
    where id = v_user_id;
  end loop;
end $$;

-- ============================================================================
-- SEED — Master data pendukung (vendors, barang, cost centers)
-- ============================================================================

insert into public.vendors (kode_vendor, nama_vendor, pic_contact_person, alamat, email)
values
  ('VDEMO01', 'PT Sumber Teknik Jaya',      'Budi Santoso', 'Jl. Industri Raya No. 10, Bekasi', 'sales@sumberteknik.co.id'),
  ('VDEMO02', 'CV Mitra Elektrik Sejahtera','Siti Aminah',  'Jl. Raya Cikarang No. 25, Bekasi', 'order@mitraelektrik.co.id'),
  ('VDEMO03', 'PT Autoparts Nusantara',     'Andi Wijaya',  'Jl. Otomotif No. 5, Bekasi',        'cs@autopartsnusantara.co.id')
on conflict (kode_vendor) do nothing;

insert into public.barang (part_number, part_name, category, uom, vendor, is_asset, last_purchase_price, description)
values
  ('BRG-DEMO-001', 'Aki Mobil 12V 60Ah',           'Spare Part', 'Unit',  'PT Sumber Teknik Jaya',       false, 950000,  'Aki mobil untuk kendaraan operasional'),
  ('BRG-DEMO-002', 'Kabel Set Kelistrikan Mobil',  'Elektrikal', 'Set',   'CV Mitra Elektrik Sejahtera', false, 450000,  'Kabel set untuk perbaikan instalasi kelistrikan'),
  ('BRG-DEMO-003', 'Lampu LED Headlamp',           'Elektrikal', 'Pcs',   'CV Mitra Elektrik Sejahtera', false, 275000,  'Lampu LED pengganti headlamp'),
  ('BRG-DEMO-004', 'Filter Oli Mesin',              'Spare Part', 'Pcs',   'PT Autoparts Nusantara',      false, 85000,   'Filter oli untuk maintenance rutin'),
  ('BRG-DEMO-005', 'Ban Mobil Ring 16',             'Spare Part', 'Pcs',   'PT Autoparts Nusantara',      false, 1250000, 'Ban untuk kendaraan operasional ring 16'),
  ('BRG-DEMO-006', 'Laptop Kerja Staff',            'Elektronik', 'Unit',  'PT Sumber Teknik Jaya',       true,  8500000, 'Laptop untuk kebutuhan kerja staff'),
  ('BRG-DEMO-007', 'Alat Tulis Kantor (Paket)',     'Consumable', 'Paket', 'CV Mitra Elektrik Sejahtera', false, 150000,  'Paket ATK untuk kebutuhan kantor')
on conflict (part_number) do nothing;

insert into public.cost_centers (name, code, company_code, initial_budget, current_budget, is_active)
select 'Operasional Head Office', 'CC-DEMO-HO', 'GMI', 500000000, 500000000, true
where not exists (select 1 from public.cost_centers where code = 'CC-DEMO-HO');

insert into public.cost_centers (name, code, company_code, initial_budget, current_budget, is_active)
select 'Maintenance & GA', 'CC-DEMO-GA', 'GMI', 250000000, 250000000, true
where not exists (select 1 from public.cost_centers where code = 'CC-DEMO-GA');

-- ============================================================================
-- SEED — Material Requests & Purchase Orders (variasi status end-to-end)
-- ============================================================================

do $$
declare
  v_ga         uuid := (select id from public.profiles where nrp = 'DEMO002');
  v_hrgahse    uuid := (select id from public.profiles where nrp = 'DEMO003');
  v_finance    uuid := (select id from public.profiles where nrp = 'DEMO004');
  v_gm         uuid := (select id from public.profiles where nrp = 'DEMO005');
  v_em         uuid := (select id from public.profiles where nrp = 'DEMO006');
  v_bod        uuid := (select id from public.profiles where nrp = 'DEMO007');
  v_hr         uuid := (select id from public.profiles where nrp = 'DEMO009');
  v_marketing  uuid := (select id from public.profiles where nrp = 'DEMO010');
  v_produksi   uuid := (select id from public.profiles where nrp = 'DEMO011');
  v_k3         uuid := (select id from public.profiles where nrp = 'DEMO012');
  v_logistik   uuid := (select id from public.profiles where nrp = 'DEMO013');
  v_warehouse  uuid := (select id from public.profiles where nrp = 'DEMO014');
  v_purchasing uuid := (select id from public.profiles where nrp = 'DEMO016');

  v_cc_ho bigint := (select id from public.cost_centers where code = 'CC-DEMO-HO');
  v_cc_ga bigint := (select id from public.cost_centers where code = 'CC-DEMO-GA');

  v_vendor1 bigint := (select id from public.vendors where kode_vendor = 'VDEMO01');
  v_vendor3 bigint := (select id from public.vendors where kode_vendor = 'VDEMO03');

  v_b1 bigint := (select id from public.barang where part_number = 'BRG-DEMO-001');
  v_b2 bigint := (select id from public.barang where part_number = 'BRG-DEMO-002');
  v_b4 bigint := (select id from public.barang where part_number = 'BRG-DEMO-004');
  v_b5 bigint := (select id from public.barang where part_number = 'BRG-DEMO-005');
  v_b6 bigint := (select id from public.barang where part_number = 'BRG-DEMO-006');
  v_b7 bigint := (select id from public.barang where part_number = 'BRG-DEMO-007');

  v_mr5_id bigint;
  v_mr6_id bigint;
begin
  -- Kalau data demo sudah pernah di-seed, jangan duplikat.
  if exists (select 1 from public.material_requests where kode_mr = 'GMI/MR/VII/26/HR/1') then
    return;
  end if;

  -- MR1 — HR — baru diajukan, belum ada approval sama sekali.
  insert into public.material_requests
    (userid, kode_mr, kategori, status, remarks, cost_estimation, department,
     company_code, tujuan_site, cost_center_id, prioritas, level,
     orders, approvals, attachments, discussions, due_date, created_at)
  values (
    v_hr, 'GMI/MR/VII/26/HR/1', 'New Item', 'Pending Validation',
    'Pengadaan ATK rutin untuk kebutuhan operasional HR', '750000', 'Human Resources',
    'GMI', 'Head Office', v_cc_ho, 'P3', 'OPEN 1',
    jsonb_build_array(
      jsonb_build_object('name','Alat Tulis Kantor (Paket)','qty','5','uom','Paket',
        'estimasi_harga',150000,'note','Kebutuhan ATK rutin bulanan','url','',
        'barang_id',v_b7,'part_number','BRG-DEMO-007','status','Pending','po_refs','[]'::jsonb)
    ),
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    now() + interval '15 days', now() - interval '1 day'
  );

  -- MR2 — Marketing — menunggu approval "Menyetujui" dari General Manager Demo
  -- (login gm.demo@demo.com bisa langsung approve saat demo).
  insert into public.material_requests
    (userid, kode_mr, kategori, status, remarks, cost_estimation, department,
     company_code, tujuan_site, cost_center_id, prioritas, level,
     orders, approvals, attachments, discussions, due_date, created_at)
  values (
    v_marketing, 'GMI/MR/VII/26/MKT/1', 'Upgrade', 'Pending Approval',
    'Laptop lama sering hang, mengganggu kerja tim marketing', '8500000', 'Marketing',
    'GMI', 'Head Office', v_cc_ho, 'P2', 'OPEN 1',
    jsonb_build_array(
      jsonb_build_object('name','Laptop Kerja Staff','qty','1','uom','Unit',
        'estimasi_harga',8500000,'note','Penggantian laptop rusak tim marketing','url','',
        'barang_id',v_b6,'part_number','BRG-DEMO-006','status','Pending','po_refs','[]'::jsonb)
    ),
    jsonb_build_array(
      jsonb_build_object('type','Validator','status','approved','userid',v_ga,
        'nama','GA Demo','email','ga.demo@demo.com','role','approver','department','General Affair',
        'processed_at', (now() - interval '3 days')::text),
      jsonb_build_object('type','Mengetahui','status','approved','userid',v_finance,
        'nama','Finance Demo','email','finance.demo@demo.com','role','approver','department','Finance',
        'processed_at', (now() - interval '2 days')::text),
      jsonb_build_object('type','Menyetujui','status','pending','userid',v_gm,
        'nama','General Manager Demo','email','gm.demo@demo.com','role','approver','department','General Manager')
    ),
    '[]'::jsonb, '[]'::jsonb,
    now() + interval '7 days', now() - interval '3 days'
  );

  -- MR3 — Produksi — ditolak oleh HRGA-HSE Demo.
  insert into public.material_requests
    (userid, kode_mr, kategori, status, remarks, cost_estimation, department,
     company_code, tujuan_site, cost_center_id, prioritas, level,
     orders, approvals, attachments, discussions, due_date, created_at)
  values (
    v_produksi, 'GMI/MR/VII/26/PROD/1', 'Fix & Repair', 'Rejected',
    'Butuh perbaikan segera, kabel kelistrikan terbakar', '900000', 'Produksi',
    'GMI', 'Head Office', v_cc_ga, 'P1', 'OPEN 1',
    jsonb_build_array(
      jsonb_build_object('name','Kabel Set Kelistrikan Mobil','qty','2','uom','Set',
        'estimasi_harga',450000,'note','Kabel terbakar akibat korsleting','url','',
        'barang_id',v_b2,'part_number','BRG-DEMO-002','status','Cancelled','po_refs','[]'::jsonb)
    ),
    jsonb_build_array(
      jsonb_build_object('type','Validator','status','approved','userid',v_ga,
        'nama','GA Demo','email','ga.demo@demo.com','role','approver','department','General Affair',
        'processed_at', (now() - interval '4 days')::text),
      jsonb_build_object('type','Mengetahui','status','rejected','userid',v_hrgahse,
        'nama','HRGA-HSE Demo','email','hrgahse.demo@demo.com','role','approver','department','HRGA-HSE',
        'processed_at', (now() - interval '3 days')::text)
    ),
    '[]'::jsonb, '[]'::jsonb,
    now() + interval '2 days', now() - interval '4 days'
  );

  -- MR4 — K3 — full approved, menunggu dibuatkan PO oleh tim purchasing.
  insert into public.material_requests
    (userid, kode_mr, kategori, status, remarks, cost_estimation, department,
     company_code, tujuan_site, cost_center_id, prioritas, level,
     orders, approvals, attachments, discussions, due_date, created_at)
  values (
    v_k3, 'GMI/MR/VII/26/HSE/1', 'New Item', 'Waiting PO',
    'Stok filter oli menipis, perlu restock untuk maintenance kendaraan', '850000', 'K3',
    'GMI', 'Head Office', v_cc_ga, 'P2', 'OPEN 2',
    jsonb_build_array(
      jsonb_build_object('name','Filter Oli Mesin','qty','10','uom','Pcs',
        'estimasi_harga',85000,'note','Stok filter oli untuk maintenance rutin','url','',
        'barang_id',v_b4,'part_number','BRG-DEMO-004','status','Pending','po_refs','[]'::jsonb)
    ),
    jsonb_build_array(
      jsonb_build_object('type','Validator','status','approved','userid',v_ga,
        'nama','GA Demo','email','ga.demo@demo.com','role','approver','department','General Affair',
        'processed_at', (now() - interval '6 days')::text),
      jsonb_build_object('type','Mengetahui','status','approved','userid',v_finance,
        'nama','Finance Demo','email','finance.demo@demo.com','role','approver','department','Finance',
        'processed_at', (now() - interval '5 days')::text),
      jsonb_build_object('type','Menyetujui','status','approved','userid',v_bod,
        'nama','Board of Director Demo','email','bod.demo@demo.com','role','approver','department','Boards of Director',
        'processed_at', (now() - interval '4 days')::text)
    ),
    '[]'::jsonb, '[]'::jsonb,
    now() + interval '10 days', now() - interval '6 days'
  );

  -- MR5 — Logistik — sudah dibuatkan PO (lihat PO1 di bawah), status "On Process".
  insert into public.material_requests
    (userid, kode_mr, kategori, status, remarks, cost_estimation, department,
     company_code, tujuan_site, cost_center_id, prioritas, level,
     orders, approvals, attachments, discussions, due_date, created_at)
  values (
    v_logistik, 'GMI/MR/VII/26/LOG/1', 'New Item', 'On Process',
    'Penggantian ban dan restock filter oli untuk armada operasional', '5850000', 'Logistik',
    'GMI', 'Head Office', v_cc_ho, 'P2', 'OPEN 3A',
    jsonb_build_array(
      jsonb_build_object('name','Ban Mobil Ring 16','qty','4','uom','Pcs',
        'estimasi_harga',1250000,'note','Ban truk operasional sudah aus','url','',
        'barang_id',v_b5,'part_number','BRG-DEMO-005','status','PO Created',
        'po_refs', jsonb_build_array('GMI/PO/VII/26/LOG/1')),
      jsonb_build_object('name','Filter Oli Mesin','qty','10','uom','Pcs',
        'estimasi_harga',85000,'note','Sekalian restock filter oli','url','',
        'barang_id',v_b4,'part_number','BRG-DEMO-004','status','PO Created',
        'po_refs', jsonb_build_array('GMI/PO/VII/26/LOG/1'))
    ),
    jsonb_build_array(
      jsonb_build_object('type','Validator','status','approved','userid',v_ga,
        'nama','GA Demo','email','ga.demo@demo.com','role','approver','department','General Affair',
        'processed_at', (now() - interval '14 days')::text),
      jsonb_build_object('type','Mengetahui','status','approved','userid',v_finance,
        'nama','Finance Demo','email','finance.demo@demo.com','role','approver','department','Finance',
        'processed_at', (now() - interval '13 days')::text),
      jsonb_build_object('type','Menyetujui','status','approved','userid',v_gm,
        'nama','General Manager Demo','email','gm.demo@demo.com','role','approver','department','General Manager',
        'processed_at', (now() - interval '12 days')::text)
    ),
    '[]'::jsonb, '[]'::jsonb,
    now() + interval '12 days', now() - interval '15 days'
  )
  returning id into v_mr5_id;

  -- MR6 — Warehouse — selesai penuh (PO2 di bawah sudah BAST & completed).
  insert into public.material_requests
    (userid, kode_mr, kategori, status, remarks, cost_estimation, department,
     company_code, tujuan_site, cost_center_id, prioritas, level,
     orders, approvals, attachments, discussions, due_date, created_at)
  values (
    v_warehouse, 'GMI/MR/VII/26/WH/1', 'New Item', 'Completed',
    'Penggantian aki dan kabel kelistrikan forklift warehouse', '3250000', 'Warehouse',
    'GMI', 'Head Office', v_cc_ho, 'P3', 'CLOSE 3',
    jsonb_build_array(
      jsonb_build_object('name','Aki Mobil 12V 60Ah','qty','2','uom','Unit',
        'estimasi_harga',950000,'note','Aki forklift warehouse soak','url','',
        'barang_id',v_b1,'part_number','BRG-DEMO-001','status','PO Created',
        'po_refs', jsonb_build_array('GMI/PO/VII/26/WH/1')),
      jsonb_build_object('name','Kabel Set Kelistrikan Mobil','qty','3','uom','Set',
        'estimasi_harga',450000,'note','Perbaikan instalasi kelistrikan forklift','url','',
        'barang_id',v_b2,'part_number','BRG-DEMO-002','status','PO Created',
        'po_refs', jsonb_build_array('GMI/PO/VII/26/WH/1'))
    ),
    jsonb_build_array(
      jsonb_build_object('type','Validator','status','approved','userid',v_ga,
        'nama','GA Demo','email','ga.demo@demo.com','role','approver','department','General Affair',
        'processed_at', (now() - interval '25 days')::text),
      jsonb_build_object('type','Mengetahui','status','approved','userid',v_finance,
        'nama','Finance Demo','email','finance.demo@demo.com','role','approver','department','Finance',
        'processed_at', (now() - interval '24 days')::text),
      jsonb_build_object('type','Menyetujui','status','approved','userid',v_em,
        'nama','Executive Manager Demo','email','em.demo@demo.com','role','approver','department','Executive Manager',
        'processed_at', (now() - interval '23 days')::text)
    ),
    '[]'::jsonb, '[]'::jsonb,
    now() + interval '20 days', now() - interval '25 days'
  )
  returning id into v_mr6_id;

  -- PO1 — dari MR5 (Logistik) — menunggu "Payment Approval" dari Finance Demo
  -- (login finance.demo@demo.com bisa langsung approve saat demo).
  insert into public.purchase_orders
    (kode_po, mr_id, user_id, status, vendor_details, items, currency,
     discount, tax, postage, total_price, payment_term, shipping_address,
     company_code, notes, attachments, approvals, pph_type, pph_rate, pph_amount,
     created_at, updated_at)
  values (
    'GMI/PO/VII/26/LOG/1', v_mr5_id, v_purchasing, 'Pending Payment',
    jsonb_build_object('vendor_id',v_vendor3,'kode_vendor','VDEMO03','nama_vendor','PT Autoparts Nusantara',
      'alamat','Jl. Otomotif No. 5, Bekasi','contact_person','Andi Wijaya','email','cs@autopartsnusantara.co.id'),
    jsonb_build_array(
      jsonb_build_object('barang_id',v_b5,'part_number','BRG-DEMO-005','name','Ban Mobil Ring 16',
        'qty',4,'uom','Pcs','price',1250000,'total_price',5000000,'vendor_name','PT Autoparts Nusantara',
        'description','Ban truk operasional sudah aus','link',''),
      jsonb_build_object('barang_id',v_b4,'part_number','BRG-DEMO-004','name','Filter Oli Mesin',
        'qty',10,'uom','Pcs','price',85000,'total_price',850000,'vendor_name','PT Autoparts Nusantara',
        'description','Sekalian restock filter oli','link','')
    ),
    'IDR', 0, 643500, 50000, 6426500, 'Net 30', 'Head Office, Jl. Sakura Regency Blok J5-8A, Jatiasih, Bekasi',
    'GMI', 'PO pembelian ban & filter oli untuk armada logistik', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('type','Validator','status','approved','userid',v_purchasing,
        'nama','Purchasing Staff Demo','email','purchasing.demo@demo.com','role','user','department','Purchasing',
        'processed_at', (now() - interval '13 days')::text),
      jsonb_build_object('type','Mengetahui','status','approved','userid',v_finance,
        'nama','Finance Demo','email','finance.demo@demo.com','role','approver','department','Finance',
        'processed_at', (now() - interval '12 days')::text),
      jsonb_build_object('type','Menyetujui','status','approved','userid',v_gm,
        'nama','General Manager Demo','email','gm.demo@demo.com','role','approver','department','General Manager',
        'processed_at', (now() - interval '11 days')::text),
      jsonb_build_object('type','Payment Approval','status','pending','userid',v_finance,
        'nama','Finance Demo','email','finance.demo@demo.com','role','approver','department','Finance')
    ),
    'pph23_npwp', 2, 117000,
    now() - interval '13 days', now() - interval '11 days'
  );

  -- PO2 — dari MR6 (Warehouse) — sudah selesai (Completed), lengkap dengan
  -- Goods Receipt & BAST.
  insert into public.purchase_orders
    (kode_po, mr_id, user_id, status, vendor_details, items, currency,
     discount, tax, postage, total_price, payment_term, shipping_address,
     company_code, notes, attachments, approvals, pph_type, pph_rate, pph_amount,
     goods_receipt, bast, created_at, updated_at)
  values (
    'GMI/PO/VII/26/WH/1', v_mr6_id, v_purchasing, 'Completed',
    jsonb_build_object('vendor_id',v_vendor1,'kode_vendor','VDEMO01','nama_vendor','PT Sumber Teknik Jaya',
      'alamat','Jl. Industri Raya No. 10, Bekasi','contact_person','Budi Santoso','email','sales@sumberteknik.co.id'),
    jsonb_build_array(
      jsonb_build_object('barang_id',v_b1,'part_number','BRG-DEMO-001','name','Aki Mobil 12V 60Ah',
        'qty',2,'uom','Unit','price',950000,'total_price',1900000,'vendor_name','PT Sumber Teknik Jaya',
        'description','Aki forklift warehouse soak','link',''),
      jsonb_build_object('barang_id',v_b2,'part_number','BRG-DEMO-002','name','Kabel Set Kelistrikan Mobil',
        'qty',3,'uom','Set','price',450000,'total_price',1350000,'vendor_name','PT Sumber Teknik Jaya',
        'description','Perbaikan instalasi kelistrikan forklift','link','')
    ),
    'IDR', 0, 357500, 30000, 3572500, 'Net 14', 'Head Office, Jl. Sakura Regency Blok J5-8A, Jatiasih, Bekasi',
    'GMI', 'PO pembelian aki & kabel kelistrikan forklift warehouse', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('type','Validator','status','approved','userid',v_purchasing,
        'nama','Purchasing Staff Demo','email','purchasing.demo@demo.com','role','user','department','Purchasing',
        'processed_at', (now() - interval '24 days')::text),
      jsonb_build_object('type','Mengetahui','status','approved','userid',v_finance,
        'nama','Finance Demo','email','finance.demo@demo.com','role','approver','department','Finance',
        'processed_at', (now() - interval '23 days')::text),
      jsonb_build_object('type','Menyetujui','status','approved','userid',v_em,
        'nama','Executive Manager Demo','email','em.demo@demo.com','role','approver','department','Executive Manager',
        'processed_at', (now() - interval '22 days')::text),
      jsonb_build_object('type','Payment Approval','status','approved','userid',v_finance,
        'nama','Finance Demo','email','finance.demo@demo.com','role','approver','department','Finance',
        'processed_at', (now() - interval '20 days')::text),
      jsonb_build_object('type','Payment Validator','status','approved','userid',v_bod,
        'nama','Board of Director Demo','email','bod.demo@demo.com','role','approver','department','Boards of Director',
        'processed_at', (now() - interval '18 days')::text)
    ),
    'pph23_non_npwp', 2, 65000,
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object('part_number','BRG-DEMO-001','name','Aki Mobil 12V 60Ah','qty',2,'qty_received',2,'received',true),
        jsonb_build_object('part_number','BRG-DEMO-002','name','Kabel Set Kelistrikan Mobil','qty',3,'qty_received',3,'received',true)
      ),
      'received_by', v_warehouse, 'received_by_name', 'Warehouse Staff Demo',
      'signature_url', '', 'printed_name', 'Warehouse Staff Demo',
      'received_at', (now() - interval '5 days')::text
    ),
    jsonb_build_object(
      'items', jsonb_build_array(
        jsonb_build_object('part_number','BRG-DEMO-001','name','Aki Mobil 12V 60Ah','qty',2,'qty_received',2,'received',true),
        jsonb_build_object('part_number','BRG-DEMO-002','name','Kabel Set Kelistrikan Mobil','qty',3,'qty_received',3,'received',true)
      ),
      'confirmed_by', v_warehouse, 'confirmed_by_name', 'Warehouse Staff Demo',
      'signature_url', '', 'printed_name', 'Warehouse Staff Demo',
      'confirmed_at', (now() - interval '3 days')::text
    ),
    now() - interval '24 days', now() - interval '3 days'
  );
end $$;
