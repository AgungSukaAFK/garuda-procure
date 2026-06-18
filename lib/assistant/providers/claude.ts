// lib/assistant/providers/claude.ts
//
// Provider Claude (Anthropic). DIPERTAHANKAN agar mudah diaktifkan kembali:
// cukup set ASSISTANT_PROVIDER=claude dan isi ANTHROPIC_API_KEY.

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../knowledge";
import {
  assistantTools,
  executeAssistantTool,
  type ToolContext,
} from "../tools";
import type { AssistantStreamArgs } from "../provider";

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 6;

export async function runClaudeStream({ history, ctx, send }: AssistantStreamArgs) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY belum di-set di server.");
  }
  const anthropic = new Anthropic();
  const toolCtx: ToolContext = ctx;

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const turn = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: assistantTools,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      messages,
    });

    turn.on("text", (delta) => send(delta));

    const final = await turn.finalMessage();
    messages.push({ role: "assistant", content: final.content });

    if (final.stop_reason !== "tool_use") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of final.content) {
      if (block.type === "tool_use") {
        const out = await executeAssistantTool(
          block.name,
          (block.input ?? {}) as Record<string, unknown>,
          toolCtx,
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: out,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }
}
