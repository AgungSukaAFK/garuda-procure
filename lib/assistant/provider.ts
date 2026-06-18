// lib/assistant/provider.ts
//
// Pemilih provider model untuk Asisten GarudaProcure. Workflow Claude & Gemini
// dua-duanya tersedia; tinggal set env ASSISTANT_PROVIDER untuk berganti.
//   ASSISTANT_PROVIDER=gemini  (default sekarang)
//   ASSISTANT_PROVIDER=claude  (aktif lagi saat sudah langganan API Anthropic)

import type { ToolContext } from "./tools";
import { runGeminiStream } from "./providers/gemini";
import { runClaudeStream } from "./providers/claude";

export interface AssistantStreamArgs {
  history: { role: "user" | "assistant"; content: string }[];
  ctx: ToolContext;
  send: (text: string) => void;
}

export const ACTIVE_PROVIDER = (
  process.env.ASSISTANT_PROVIDER || "gemini"
).toLowerCase();

export async function runAssistantStream(args: AssistantStreamArgs): Promise<void> {
  if (ACTIVE_PROVIDER === "claude") return runClaudeStream(args);
  return runGeminiStream(args);
}
