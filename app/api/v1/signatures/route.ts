// app/api/v1/signatures/route.ts
//
// GET  : daftar TTD milik user yang login (tanpa password_hash).
// POST : buat TTD baru (re-auth password akun + set password signature bcrypt).
// Semua server-only; password_hash tidak pernah keluar ke client.

import { createClient } from "@/lib/supabase/server";
import { createClient as createSbClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BUCKET = "signatures";
const MAX_SIGNATURES = 6;
const SIGNATURE_COLUMNS =
  "id, user_id, image_url, printed_name, label, is_hidden, created_at";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const { data, error } = await supabase
    .from("user_signatures")
    .select(SIGNATURE_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email)
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const form = await request.formData();
  const image = form.get("image") as File | null;
  const label = String(form.get("label") || "").trim();
  const accountPassword = String(form.get("accountPassword") || "");
  const signaturePassword = String(form.get("signaturePassword") || "");

  if (!image) return NextResponse.json({ error: "Gambar TTD wajib." }, { status: 400 });
  if (!label) return NextResponse.json({ error: "Label wajib diisi." }, { status: 400 });
  if (signaturePassword.length < 6)
    return NextResponse.json(
      { error: "Password signature minimal 6 karakter." },
      { status: 400 },
    );
  if (image.size > 2 * 1024 * 1024)
    return NextResponse.json({ error: "Ukuran gambar maksimal 2MB." }, { status: 400 });

  // Re-auth password akun (opsional). User yang login via Google tidak punya
  // password akun, jadi cukup andalkan sesi login yang sudah valid. Jika
  // accountPassword diisi (user email/password), verifikasi sebagai lapisan
  // keamanan tambahan.
  if (accountPassword) {
    const verifier = createSbClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: reauthErr } = await verifier.auth.signInWithPassword({
      email: user.email,
      password: accountPassword,
    });
    if (reauthErr)
      return NextResponse.json(
        { error: "Password akun salah." },
        { status: 401 },
      );
  }

  // Cek kuota.
  const { count } = await supabase
    .from("user_signatures")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= MAX_SIGNATURES)
    return NextResponse.json(
      { error: `Maksimal ${MAX_SIGNATURES} tanda tangan per akun.` },
      { status: 400 },
    );

  // printed_name dari profiles.nama.
  const { data: profile } = await supabase
    .from("profiles")
    .select("nama")
    .eq("id", user.id)
    .maybeSingle();
  const printedName = profile?.nama || user.email;

  const passwordHash = await bcrypt.hash(signaturePassword, 10);

  // Upload gambar ke folder milik user.
  const ext = (image.name.split(".").pop() || "png").toLowerCase();
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, await image.arrayBuffer(), {
      contentType: image.type || "image/png",
      upsert: false,
    });
  if (upErr)
    return NextResponse.json(
      { error: `Gagal unggah gambar: ${upErr.message}` },
      { status: 500 },
    );

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { data: inserted, error: insErr } = await supabase
    .from("user_signatures")
    .insert({
      user_id: user.id,
      image_url: pub.publicUrl,
      printed_name: printedName,
      label,
      password_hash: passwordHash,
    })
    .select(SIGNATURE_COLUMNS)
    .single();

  if (insErr) {
    // rollback file
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ data: inserted });
}
