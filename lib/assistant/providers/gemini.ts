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

// gemini-2.0-flash punya kuota harian free tier lebih besar daripada 2.5-flash
// (yang hanya ~20 request/hari). Bisa di-override via env GEMINI_MODEL.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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
    for await (const chunk of stream) {
      if (chunk.text) send(chunk.text);
      for (const fc of chunk.functionCalls ?? []) {
        if (fc.name) calls.push({ name: fc.name, args: (fc.args ?? {}) as Record<string, unknown> });
      }
    }

    if (calls.length === 0) break; // jawaban akhir sudah selesai

    // Catat giliran model (function call) + balas dengan hasil tool.
    contents.push({
      role: "model",
      parts: calls.map((c) => ({ functionCall: { name: c.name, args: c.args } })),
    });
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
