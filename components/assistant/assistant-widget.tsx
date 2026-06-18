"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  X,
  Send,
  Loader2,
  GripVertical,
  RotateCcw,
  LayoutGrid,
  Check,
  MessageSquarePlus,
} from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  useAssistantWidget,
  MIN_W,
  MIN_H,
  type Corner,
} from "@/lib/zustand/assistantWidget";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GAP = 24;
const HEADER_OFFSET = 76; // ruang untuk header dashboard saat docked di atas

const CORNERS: { key: Corner; label: string }[] = [
  { key: "br", label: "Kanan Bawah" },
  { key: "bl", label: "Kiri Bawah" },
  { key: "tr", label: "Kanan Atas" },
  { key: "tl", label: "Kiri Atas" },
];

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Halo! Saya Asisten GarudaProcure. Tanyakan prosedur (alur MR/PO, arti status, dll) atau cek progres dokumen Anda — misalnya: \"progres MR saya gimana?\" atau \"list PO saya yang Pending BAST\".",
};

// Riwayat chat disimpan di localStorage, di-key per user. Refresh tetap ada;
// login sebagai user lain otomatis mulai dari awal.
const CHAT_KEY = "gp-assistant-chat";

// Styling markdown jawaban asisten (tanpa plugin typography agar tetap ringan).
const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background/60 px-1 py-0.5 text-[0.85em]">
      {children}
    </code>
  ),
  h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
};

// Indikator "sedang mengetik": tiga titik memantul bergiliran.
function TypingDots() {
  return (
    <span
      className="flex items-center gap-1 py-1"
      role="status"
      aria-label="Asisten sedang mengetik"
    >
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const { pos, corner, size, setPos, setCorner, setSize, resetPosition } =
    useAssistantWidget();

  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );

  // Auto-scroll ke bawah saat ada pesan baru.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  // Hidrasi: ambil user yang login, lalu pulihkan riwayat bila milik user yang sama.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await createClient().auth.getUser();
        const uid = data.user?.id ?? null;
        if (!active) return;
        setUserId(uid);
        const raw = localStorage.getItem(CHAT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            userId: string | null;
            messages: ChatMessage[];
          };
          if (
            parsed.userId === uid &&
            Array.isArray(parsed.messages) &&
            parsed.messages.length > 0
          ) {
            setMessages(parsed.messages);
          }
        }
      } catch {
        // abaikan — mulai dengan greeting default
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Simpan riwayat tiap ada perubahan (setelah hidrasi, agar tidak menimpa duluan).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify({ userId, messages }));
    } catch {
      // localStorage penuh / tidak tersedia — abaikan
    }
  }, [messages, userId, hydrated]);

  const newChat = () => {
    setMessages([GREETING]);
    try {
      localStorage.removeItem(CHAT_KEY);
    } catch {
      // abaikan
    }
    setMenuOpen(false);
  };

  // Posisi panel: floating (pos) atau docked (corner).
  const panelStyle = (): React.CSSProperties => {
    const w = Math.min(size.w, typeof window !== "undefined" ? window.innerWidth - GAP * 2 : size.w);
    const h = Math.min(size.h, typeof window !== "undefined" ? window.innerHeight - GAP * 2 : size.h);
    const base: React.CSSProperties = { width: w, height: h };
    if (pos) return { ...base, left: pos.x, top: pos.y };
    switch (corner) {
      case "bl":
        return { ...base, left: GAP, bottom: GAP };
      case "tr":
        return { ...base, right: GAP, top: HEADER_OFFSET };
      case "tl":
        return { ...base, left: GAP, top: HEADER_OFFSET };
      default:
        return { ...base, right: GAP, bottom: GAP };
    }
  };

  // ---- Drag (lewat header) ----
  const onDragDown = (e: React.PointerEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!drag.current || !panelRef.current) return;
    const w = panelRef.current.offsetWidth;
    const h = panelRef.current.offsetHeight;
    const x = Math.min(
      Math.max(GAP, e.clientX - drag.current.dx),
      window.innerWidth - w - GAP,
    );
    const y = Math.min(
      Math.max(GAP, e.clientY - drag.current.dy),
      window.innerHeight - h - GAP,
    );
    setPos({ x, y });
  };
  const onDragUp = (e: React.PointerEvent) => {
    drag.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // ---- Resize (handle pojok kanan-bawah) ----
  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    // Kunci ke posisi floating dari titik kiri-atas saat ini agar resize konsisten.
    setPos({ x: rect.left, y: rect.top });
    resize.current = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!resize.current) return;
    setSize({
      w: Math.max(MIN_W, resize.current.w + (e.clientX - resize.current.x)),
      h: Math.max(MIN_H, resize.current.h + (e.clientY - resize.current.y)),
    });
  };
  const onResizeUp = (e: React.PointerEvent) => {
    resize.current = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // ---- Kirim pesan + streaming ----
  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Kirim histori tanpa greeting awal.
        body: JSON.stringify({
          messages: next.filter((m) => m !== GREETING),
        }),
      });

      if (!res.ok || !res.body) {
        const msg =
          res.status === 401
            ? "Sesi Anda berakhir. Silakan muat ulang halaman."
            : "Gagal menghubungi asisten.";
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + chunk };
          return copy;
        });
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "⚠️ Terjadi gangguan koneksi. Coba lagi ya.",
        };
        return copy;
      });
    } finally {
      setBusy(false);
    }
  }, [input, busy, messages]);

  // ---- Launcher (FAB) ----
  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        aria-label="Buka Asisten GarudaProcure"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg p-0"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={panelStyle()}
      className="fixed z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
    >
      {/* Header (drag handle) */}
      <div
        onPointerDown={onDragDown}
        onPointerMove={onDragMove}
        onPointerUp={onDragUp}
        className="flex cursor-grab items-center gap-2 border-b bg-muted/50 px-3 py-2 active:cursor-grabbing select-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <Sparkles
          className={cn("h-4 w-4 text-primary", busy && "animate-pulse")}
        />
        <span className="text-sm font-semibold">Asisten GarudaProcure</span>
        {busy && (
          <span className="text-xs font-normal text-muted-foreground">
            mengetik…
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Atur posisi widget"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            {menuOpen && (
              <div
                className="absolute right-0 top-9 z-10 w-44 rounded-md border bg-popover p-1 shadow-md"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  Tempel ke sudut
                </p>
                {CORNERS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => {
                      setCorner(c.key);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    {c.label}
                    {!pos && corner === c.key && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={newChat}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" /> Mulai chat baru
                </button>
                <button
                  onClick={() => {
                    resetPosition();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset posisi & ukuran
                </button>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Tutup asisten"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Pesan */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                m.role === "user"
                  ? "whitespace-pre-wrap rounded-br-sm bg-primary text-primary-foreground"
                  : "rounded-bl-sm bg-muted",
              )}
            >
              {m.role === "assistant" ? (
                m.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                    {m.content}
                  </ReactMarkdown>
                ) : busy && i === messages.length - 1 ? (
                  <TypingDots />
                ) : null
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t p-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={
            busy
              ? "Asisten sedang menjawab…"
              : "Tanya prosedur atau cek progres dokumen…"
          }
          disabled={busy}
          aria-busy={busy}
          className="max-h-28 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={busy || !input.trim()}
          aria-label="Kirim"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Handle resize (pojok kanan-bawah) */}
      <div
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        style={{
          background:
            "linear-gradient(135deg, transparent 50%, hsl(var(--border)) 50%)",
        }}
        aria-label="Ubah ukuran"
      />
    </div>
  );
}
