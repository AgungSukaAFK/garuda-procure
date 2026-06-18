// app/api/v1/signatures/[id]/route.ts
//
// PATCH  : ubah label / is_hidden (kolom sensitif dilindungi trigger DB).
// DELETE : hapus TTD + file storage-nya.

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const BUCKET = "signatures";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    label?: string;
    is_hidden?: boolean;
  };
  const patch: Record<string, unknown> = {};
  if (typeof body.label === "string" && body.label.trim())
    patch.label = body.label.trim();
  if (typeof body.is_hidden === "boolean") patch.is_hidden = body.is_hidden;
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

  const { error } = await supabase
    .from("user_signatures")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  // Ambil dulu image_url untuk menghapus file storage.
  const { data: row } = await supabase
    .from("user_signatures")
    .select("image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { error } = await supabase
    .from("user_signatures")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hapus file (path = bagian setelah '/signatures/').
  if (row?.image_url) {
    const marker = `/${BUCKET}/`;
    const idx = row.image_url.indexOf(marker);
    if (idx !== -1) {
      const path = row.image_url.slice(idx + marker.length);
      await supabase.storage.from(BUCKET).remove([path]);
    }
  }
  return NextResponse.json({ success: true });
}
