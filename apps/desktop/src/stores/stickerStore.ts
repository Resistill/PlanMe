import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "./editorStore";

const STORAGE_KEY = "planme-sticker";

function saveStickerState(stickerMode: boolean, opacity: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ stickerMode, opacity }));
  } catch {}
}

function loadStickerState(): { stickerMode: boolean; opacity: number } | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

interface StickerState {
  stickerMode: boolean;
  opacity: number;

  toggleStickerMode: () => void;
  setStickerModeLocal: (on: boolean) => void;
  setOpacity: (opacity: number) => void;
  restoreStickerMode: () => void;
}

const saved = loadStickerState();

export const useStickerStore = create<StickerState>((set, get) => ({
  stickerMode: false,
  opacity: saved?.opacity ?? 0.85,

  toggleStickerMode: async () => {
    const next = !get().stickerMode;
    set({ stickerMode: next });
    saveStickerState(next, get().opacity);

    if (next) {
      const editor = useEditorStore.getState();
      if (editor.sidebarOpen) editor.toggleSidebar();
    }

    try {
      await invoke("toggle_sticker_mode", {
        enabled: next,
        opacity: get().opacity,
      });
    } catch (e) {
      console.error("Failed to toggle sticker mode:", e);
      set({ stickerMode: !next });
      saveStickerState(!next, get().opacity);
    }
  },

  setStickerModeLocal: (on) => {
    set({ stickerMode: on });
    saveStickerState(on, get().opacity);
    if (on) {
      const editor = useEditorStore.getState();
      if (editor.sidebarOpen) editor.toggleSidebar();
    }
  },

  setOpacity: async (opacity) => {
    set({ opacity });
    saveStickerState(get().stickerMode, opacity);
    if (get().stickerMode) {
      try {
        await invoke("set_sticker_opacity", { opacity });
      } catch (e) {
        console.error("Failed to set sticker opacity:", e);
      }
    }
  },

  restoreStickerMode: async () => {
    const saved = loadStickerState();
    if (saved?.stickerMode) {
      set({ stickerMode: true, opacity: saved.opacity });

      const editor = useEditorStore.getState();
      if (editor.sidebarOpen) editor.toggleSidebar();

      try {
        await invoke("toggle_sticker_mode", {
          enabled: true,
          opacity: saved.opacity,
        });
      } catch (e) {
        console.error("Failed to restore sticker mode:", e);
        set({ stickerMode: false });
        saveStickerState(false, saved.opacity);
      }
    }
  },
}));
