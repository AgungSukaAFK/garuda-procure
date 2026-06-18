import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Callback OAuth (mis. Login with Google).
// Supabase mengarahkan balik ke sini dengan ?code=... (alur PKCE).
// Tukar code menjadi session, lalu lanjut. User baru yang profilnya
// belum lengkap (nrp/company kosong) akan diarahkan middleware ke
// /pending-approval, jadi cukup arahkan ke `next` di sini.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Provider mengembalikan error (mis. user batal di layar consent Google)
  const errorDescription =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/auth/error?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/auth/error?error=${encodeURIComponent("Kode otorisasi tidak ditemukan")}`,
  );
}
