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
