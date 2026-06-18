// lib/zustand/assistantWidget.ts
//
// State posisi & ukuran widget asisten, dipersist ke localStorage agar preferensi
// pengguna (mau ditaruh di mana, sebesar apa) tersimpan antar sesi.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Corner = "br" | "bl" | "tr" | "tl";

export interface WidgetSettings {
  // Posisi mengambang bebas (px dari kiri-atas). null = pakai corner preset.
  pos: { x: number; y: number } | null;
  corner: Corner;
  size: { w: number; h: number };

  setPos: (pos: { x: number; y: number } | null) => void;
  setCorner: (corner: Corner) => void;
  setSize: (size: { w: number; h: number }) => void;
  resetPosition: () => void;
}

export const MIN_W = 320;
export const MIN_H = 380;
const DEFAULT_SIZE = { w: 384, h: 560 };

export const useAssistantWidget = create<WidgetSettings>()(
  persist(
    (set) => ({
      pos: null,
      corner: "br",
      size: DEFAULT_SIZE,
      setPos: (pos) => set({ pos }),
      setCorner: (corner) => set({ corner, pos: null }),
      setSize: (size) =>
        set({
          size: {
            w: Math.max(MIN_W, size.w),
            h: Math.max(MIN_H, size.h),
          },
        }),
      resetPosition: () => set({ pos: null, corner: "br", size: DEFAULT_SIZE }),
    }),
    { name: "gp-assistant-widget" },
  ),
);
