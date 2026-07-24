// lib/assistant/providers/gemini.ts
//
// Provider Google Gemini (free tier). Memakai tool schema & executor yang sama
// (read-only) seperti provider Claude — hanya format function-calling-nya yang
// disesuaikan ke Gemini.

import {
  GoogleGenAI,
  Type,
  type Content,
  type FunctionDeclaration,
  type Schema,
} from "@google/genai";
import { SYSTEM_PROMPT } from "../knowledge";
import { assistantTools, runAssistantTool, type ToolContext } from "../tools";
import type { AssistantStreamArgs } from "../provider";

// gemini-2.0-flash & gemini-2.5-flash-lite sudah tidak tersedia untuk project
// baru (retired / "no longer available to new users"). Pakai alias
// "-latest" supaya otomatis ikut model lite terbaru tanpa perlu update kode
// lagi tiap kali Google retire versi lama. Bisa di-override via env GEMINI_MODEL.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
const MAX_TOOL_ROUNDS = 6;

// ---- Konversi schema tool (JSON Schema) → schema Gemini ----
function mapType(t: unknown): Type {
  switch (t) {
    case "string":
      return Type.STRING;
    case "integer":
      return Type.INTEGER;
    case "number":
      return Type.NUMBER;
    case "boolean":
      return Type.BOOLEAN;
    case "array":
      return Type.ARRAY;
    default:
      return Type.STRING;
  }
}

function toGeminiParams(
  inputSchema: Record<string, unknown> | undefined,
): Schema | undefined {
  const props = (inputSchema?.properties ?? {}) as Record<
    string,
    { type?: unknown; description?: string }
  >;
  const keys = Object.keys(props);
  if (keys.length === 0) return undefined; // fungsi tanpa argumen
  const properties: Record<string, Schema> = {};
  for (const k of keys) {
    properties[k] = {
      type: mapType(props[k].type),
      description: props[k].description,
    };
  }
  return {
    type: Type.OBJECT,
    properties,
    required: (inputSchema?.required as string[] | undefined) ?? undefined,
  };
}

const functionDeclarations: FunctionDeclaration[] = assistantTools.map((t) => ({
  name: t.name,
  description: t.description ?? undefined,
  parameters: toGeminiParams(t.input_schema as Record<string, unknown>),
}));

export async function runGeminiStream({ history, ctx, send }: AssistantStreamArgs) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum di-set di server.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const toolCtx: ToolContext = ctx;

  const contents: Content[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const config = {
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations }],
    automaticFunctionCalling: { disable: true },
  };

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config,
    });

    const calls: { name: string; args: Record<string, unknown> }[] = [];
    // Simpan parts mentah (termasuk thoughtSignature) — model-model terbaru
    // (mis. gemini-3.x) mewajibkan thought_signature dikirim balik persis di
    // functionCall part saat multi-turn tool use, kalau tidak API menolak
    // dengan 400 "missing a thought_signature".
    const modelParts: NonNullable<Content["parts"]> = [];
    for await (const chunk of stream) {
      if (chunk.text) send(chunk.text);
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (parts) modelParts.push(...parts);
      for (const fc of chunk.functionCalls ?? []) {
        if (fc.name) calls.push({ name: fc.name, args: (fc.args ?? {}) as Record<string, unknown> });
      }
    }

    if (calls.length === 0) break; // jawaban akhir sudah selesai

    // Catat giliran model (function call, dengan thoughtSignature apa adanya)
    // + balas dengan hasil tool.
    contents.push({ role: "model", parts: modelParts });
    const parts = [];
    for (const c of calls) {
      const result = await runAssistantTool(c.name, c.args, toolCtx);
      parts.push({
        functionResponse: { name: c.name, response: { result } },
      });
    }
    contents.push({ role: "user", parts });
  }
}
