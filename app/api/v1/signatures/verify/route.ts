// app/api/v1/signatures/verify/route.ts
//
// Verifikasi password signature (bcrypt) + lockout. Inti keamanan saat approve.
// 5x gagal -> profiles.is_active=false (akun terkunci). Sukses -> reset counter
// dan kembalikan { image_url, printed_name } untuk ditempel ke langkah approval.

import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { signatureId, password } = (await request
    .json()
    .catch(() => ({}))) as { signatureId?: string; password?: string };
  if (!signatureId || !password)
    return NextResponse.json(
      { error: "signatureId & password wajib." },
      { status: 400 },
    );

  // Ambil hash signature (RLS memastikan hanya milik user ini).
  const { data: sig } = await supabase
    .from("user_signatures")
    .select("image_url, printed_name, password_hash")
    .eq("id", signatureId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sig)
    return NextResponse.json(
      { error: "Tanda tangan tidak ditemukan." },
      { status: 404 },
    );

  // Status lockout dari profiles.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, signature_failed_attempts")
    .eq("id", user.id)
    .maybeSingle();

  if (profile && profile.is_active === false)
    return NextResponse.json(
      { error: "Akun Anda terkunci. Hubungi admin untuk mengaktifkan kembali." },
      { status: 403 },
    );

  const ok = await bcrypt.compare(password, sig.password_hash);

  if (!ok) {
    const { data: attemptResult } = await supabase.rpc(
      "record_signature_attempt",
      { p_success: false },
    );
    const row = attemptResult?.[0];
    const attempts = row?.attempts ?? (profile?.signature_failed_attempts ?? 0) + 1;
    const locked = row?.locked ?? attempts >= MAX_ATTEMPTS;
    return NextResponse.json(
      {
        error: locked
          ? "Password salah. Akun terkunci karena 5x percobaan gagal."
          : `Password signature salah. Sisa percobaan: ${MAX_ATTEMPTS - attempts}.`,
        locked,
      },
      { status: 401 },
    );
  }

  // Sukses: reset counter bila perlu.
  if ((profile?.signature_failed_attempts ?? 0) > 0) {
    await supabase.rpc("record_signature_attempt", { p_success: true });
  }

  return NextResponse.json({
    success: true,
    image_url: sig.image_url,
    printed_name: sig.printed_name,
  });
}
