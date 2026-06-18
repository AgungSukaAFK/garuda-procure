import { createClient } from "@supabase/supabase-js";

/**
 * Admin client memakai SERVICE ROLE key — HANYA boleh dipakai di sisi server
 * (route handler / server action). JANGAN pernah diimpor ke komponen client,
 * karena service role key melewati RLS dan punya akses penuh.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL belum di-set di environment.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
