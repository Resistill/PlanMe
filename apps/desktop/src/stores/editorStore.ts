import { create } from "zustand";

export interface FileEntry {
  filename: string;
  path: string;
  updatedAt: string;
}

interface EditorState {
  files: FileEntry[];
  activeFile: string | null;
  content: string;
  dirty: boolean;
  sidebarOpen: boolean;
  saving: boolean;

  setFiles: (files: FileEntry[]) => void;
  setActiveFile: (path: string | null) => void;
  setContent: (content: string) => void;
  setDirty: (dirty: boolean) => void;
  toggleSidebar: () => void;
  setSaving: (saving: boolean) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  files: [],
  activeFile: null,
  content: "",
  dirty: false,
  sidebarOpen: true,
  saving: false,

  setFiles: (files) => set({ files }),
  setActiveFile: (path) => set({ activeFile: path }),
  setContent: (content) => set({ content, dirty: true }),
  setDirty: (dirty) => set({ dirty }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSaving: (saving) => set({ saving }),
}));
