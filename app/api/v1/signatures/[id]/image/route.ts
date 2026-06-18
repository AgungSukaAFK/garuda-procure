// app/api/v1/signatures/[id]/image/route.ts
//
// Ganti gambar tanda tangan milik sendiri. Upload gambar baru ke storage,
// update image_url, lalu hapus file lama. Server-only, wajib login.

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const BUCKET = "signatures";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // Pastikan tanda tangan milik user ini, dan ambil image lama.
  const { data: existing } = await supabase
    .from("user_signatures")
    .select("image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json(
      { error: "Tanda tangan tidak ditemukan." },
      { status: 404 },
    );
  }

  const form = await request.formData();
  const image = form.get("image") as File | null;
  if (!image) {
    return NextResponse.json({ error: "Gambar wajib diunggah." }, { status: 400 });
  }
  if (image.size > 2 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Ukuran gambar maksimal 2MB." },
      { status: 400 },
    );
  }

  // Upload gambar baru.
  const ext = (image.name.split(".").pop() || "png").toLowerCase();
  const path = `${user.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, await image.arrayBuffer(), {
      contentType: image.type || "image/png",
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json(
      { error: `Gagal unggah gambar: ${upErr.message}` },
      { status: 500 },
    );
  }
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Update image_url.
  const { error: updErr } = await supabase
    .from("user_signatures")
    .update({ image_url: pub.publicUrl })
    .eq("id", id)
    .eq("user_id", user.id);
  if (updErr) {
    await supabase.storage.from(BUCKET).remove([path]); // rollback file baru
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Hapus file lama (best-effort).
  const marker = `/${BUCKET}/`;
  const idx = existing.image_url.indexOf(marker);
  if (idx !== -1) {
    const oldPath = existing.image_url.slice(idx + marker.length);
    await supabase.storage.from(BUCKET).remove([oldPath]);
  }

  return NextResponse.json({ success: true, image_url: pub.publicUrl });
}
