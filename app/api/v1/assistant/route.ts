// app/api/v1/assistant/route.ts
//
// Endpoint Asisten GarudaProcure. Server-only (API key tidak pernah ke client).
// Wajib login. Provider model dipilih lewat env ASSISTANT_PROVIDER
// (gemini default; claude saat sudah langganan API Anthropic) — lihat
// lib/assistant/provider.ts.

import { createClient } from "@/lib/supabase/server";
import { runAssistantStream } from "@/lib/assistant/provider";
import type { ToolContext } from "@/lib/assistant/tools";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type IncomingMessage = { role: "user" | "assistant"; content: string };

// Terjemahkan error mentah penyedia model jadi pesan ramah (tanpa dump JSON).
function friendlyAssistantError(raw: string): string {
  const r = raw.toLowerCase();
  if (
    r.includes("429") ||
    r.includes("resource_exhausted") ||
    r.includes("quota") ||
    r.includes("too many requests") ||
    r.includes("rate limit")
  ) {
    return "Maaf, kuota asisten untuk saat ini sudah habis. Coba lagi beberapa saat lagi ya — kalau sering terjadi, kuota harian gratisnya mungkin sudah penuh.";
  }
  if (r.includes("api_key") || r.includes("api key") || r.includes("401") || r.includes("403")) {
    return "Maaf, konfigurasi asisten bermasalah (API key). Hubungi admin ya.";
  }
  return "Maaf, asisten sedang bermasalah. Coba lagi sebentar lagi ya.";
}

export async function POST(request: Request) {
  // 1) Auth — wajib login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  // 2) Validasi input.
  let body: { messages?: IncomingMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }
  const history = (body.messages || [])
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== "",
    )
    .slice(-20);
  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "Pesan terakhir harus dari pengguna." },
      { status: 400 },
    );
  }

  const ctx: ToolContext = { supabase, userId: user.id };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        await runAssistantStream({ history, ctx, send });
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : String(err);
        send(`\n\n⚠️ ${friendlyAssistantError(raw)}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
