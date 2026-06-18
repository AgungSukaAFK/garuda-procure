// app/api/v1/admin/reset-password/route.ts
//
// Admin me-reset password user lain. Menggantikan alur "forgot password" via
// email. Memakai SERVICE ROLE key (createAdminClient) yang HANYA jalan di
// server. Otorisasi diperiksa berlapis: harus login, harus role admin, dan
// (kecuali LOURDES) target harus satu company dengan admin.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // Pastikan pemanggil benar-benar admin (cek di DB, bukan dari input).
  const { data: me } = await supabase
    .from("profiles")
    .select("role, company")
    .eq("id", user.id)
    .single();

  if (me?.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang boleh mereset password." },
      { status: 403 },
    );
  }

  const { userId, newPassword } = await request.json();

  if (!userId || typeof newPassword !== "string" || newPassword.length < 6) {
    return NextResponse.json(
      { error: "userId wajib dan password minimal 6 karakter." },
      { status: 400 },
    );
  }

  // Batasi admin hanya boleh mereset user di company yang sama (kecuali LOURDES).
  const { data: target } = await supabase
    .from("profiles")
    .select("company")
    .eq("id", userId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }
  if (me.company !== "LOURDES" && target.company !== me.company) {
    return NextResponse.json(
      { error: "Tidak boleh mereset user di luar company Anda." },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
