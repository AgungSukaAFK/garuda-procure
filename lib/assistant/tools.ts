// lib/assistant/tools.ts
//
// Tool READ-ONLY untuk Asisten GarudaProcure. Semua query memakai Supabase server
// client (punya sesi user). TIDAK ADA operasi tulis di sini — hanya SELECT.

import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ToolContext {
  supabase: SupabaseClient;
  userId: string;
}

// Definisi schema tool yang dikirim ke Claude.
export const assistantTools: Anthropic.Tool[] = [
  {
    name: "info_saya",
    description:
      "Ambil identitas pengguna yang sedang login (nama, role, departemen, company). Panggil ini saat pengguna menyebut 'saya'/'punya saya' agar penelusuran data milik sendiri akurat.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "cari_material_request",
    description:
      "Cari satu Material Request (MR) berdasarkan kode MR persis untuk melihat status & progresnya.",
    input_schema: {
      type: "object",
      properties: {
        kode_mr: { type: "string", description: "Kode MR, mis. 'GMI/MR/...'" },
      },
      required: ["kode_mr"],
    },
  },
  {
    name: "list_material_request",
    description:
      "Daftar Material Request dengan filter opsional. Gunakan untuk pertanyaan seperti 'list MR saya yang pending BAST' atau 'MR dengan status On Process'.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Filter status (cocok sebagian, mis. 'On Process', 'Pending', 'Open', 'Close').",
        },
        milik_saya: {
          type: "boolean",
          description: "true = hanya MR milik pengguna yang login.",
        },
        limit: { type: "integer", description: "Maks baris (default 10, maks 25)." },
      },
    },
  },
  {
    name: "cari_purchase_order",
    description:
      "Cari satu Purchase Order (PO) berdasarkan kode PO persis untuk melihat status (termasuk apakah sudah dibayar / Pending BAST / Completed).",
    input_schema: {
      type: "object",
      properties: {
        kode_po: { type: "string", description: "Kode PO, mis. 'GMI/PO/VI/26/HO/123'." },
      },
      required: ["kode_po"],
    },
  },
  {
    name: "list_purchase_order",
    description:
      "Daftar Purchase Order dengan filter opsional (status, milik sendiri, company). Untuk pertanyaan seperti 'PO saya yang pending payment' atau 'PO pending BAST'.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            "Filter status (cocok sebagian): Pending Validation/Approval/Payment/BAST, Completed, Rejected.",
        },
        milik_saya: {
          type: "boolean",
          description: "true = hanya PO milik pengguna yang login.",
        },
        limit: { type: "integer", description: "Maks baris (default 10, maks 25)." },
      },
    },
  },
];

const clampLimit = (n: unknown) => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : 10;
  return Math.min(Math.max(v, 1), 25);
};

// Ambil nama pemilik untuk sekumpulan id user (satu query profiles).
async function resolveOwnerNames(
  supabase: SupabaseClient,
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from("profiles")
    .select("id, nama")
    .in("id", unique);
  (data || []).forEach((r: { id: string; nama: string | null }) =>
    map.set(r.id, r.nama || "-"),
  );
  return map;
}

type ToolResult = Record<string, unknown> | { error: string };

// Versi string (dipakai provider Claude: tool_result content berupa string).
export async function executeAssistantTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const result = await runAssistantTool(name, input, ctx);
  return JSON.stringify(result);
}

// Versi objek (dipakai provider Gemini: functionResponse.response berupa objek).
export async function runAssistantTool(
  name: string,
  input: Record<string, unknown>,
  { supabase, userId }: ToolContext,
): Promise<ToolResult> {
  switch (name) {
    case "info_saya": {
      const { data, error } = await supabase
        .from("profiles")
        .select("nama, role, department, company")
        .eq("id", userId)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Profil tidak ditemukan." };
      return { profil: data };
    }

    case "cari_material_request": {
      const kode = String(input.kode_mr || "").trim();
      if (!kode) return { error: "kode_mr wajib diisi." };
      const { data, error } = await supabase
        .from("material_requests")
        .select(
          "id, kode_mr, status, level, prioritas, department, company_code, tujuan_site, cost_estimation, created_at, due_date, userid",
        )
        .eq("kode_mr", kode)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { ditemukan: false, pesan: `MR '${kode}' tidak ditemukan.` };
      const names = await resolveOwnerNames(supabase, [data.userid]);
      return {
        ditemukan: true,
        mr: { ...data, pemilik: names.get(data.userid) ?? "-", userid: undefined },
      };
    }

    case "list_material_request": {
      const limit = clampLimit(input.limit);
      let q = supabase
        .from("material_requests")
        .select(
          "kode_mr, status, level, prioritas, department, company_code, created_at, userid",
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (input.milik_saya === true) q = q.eq("userid", userId);
      if (input.status) q = q.ilike("status", `%${String(input.status)}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const names = await resolveOwnerNames(supabase, (data || []).map((r) => r.userid));
      return {
        jumlah: data?.length ?? 0,
        daftar: (data || []).map((r) => ({
          ...r,
          pemilik: names.get(r.userid) ?? "-",
          userid: undefined,
        })),
      };
    }

    case "cari_purchase_order": {
      const kode = String(input.kode_po || "").trim();
      if (!kode) return { error: "kode_po wajib diisi." };
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          "id, kode_po, status, total_price, currency, company_code, created_at, user_id, mr_id",
        )
        .eq("kode_po", kode)
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { ditemukan: false, pesan: `PO '${kode}' tidak ditemukan.` };
      const names = await resolveOwnerNames(supabase, [data.user_id]);
      let kode_mr: string | null = null;
      if (data.mr_id) {
        const { data: mr } = await supabase
          .from("material_requests")
          .select("kode_mr")
          .eq("id", data.mr_id)
          .maybeSingle();
        kode_mr = mr?.kode_mr ?? null;
      }
      return {
        ditemukan: true,
        po: {
          ...data,
          pemilik: names.get(data.user_id) ?? "-",
          dari_mr: kode_mr,
          user_id: undefined,
          mr_id: undefined,
        },
      };
    }

    case "list_purchase_order": {
      const limit = clampLimit(input.limit);
      let q = supabase
        .from("purchase_orders")
        .select("kode_po, status, total_price, company_code, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (input.milik_saya === true) q = q.eq("user_id", userId);
      if (input.status) q = q.ilike("status", `%${String(input.status)}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const names = await resolveOwnerNames(supabase, (data || []).map((r) => r.user_id));
      return {
        jumlah: data?.length ?? 0,
        daftar: (data || []).map((r) => ({
          ...r,
          pemilik: names.get(r.user_id) ?? "-",
          user_id: undefined,
        })),
      };
    }

    default:
      return { error: `Tool tidak dikenal: ${name}` };
  }
}
