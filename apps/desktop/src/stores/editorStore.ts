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

  /**
   * 每次由外部（同步拉取、冲突解决）写入内容时 +1。
   * 编辑器只在这个值变化时才把 content 灌回 CodeMirror，
   * 避免用打字产生的 content 变化去反向覆盖编辑器。
   */
  externalRevision: number;

  setFiles: (files: FileEntry[]) => void;
  setActiveFile: (path: string | null) => void;
  setContent: (content: string) => void;
  /** 外部写入：标记为非脏，并推进 externalRevision */
  setContentExternal: (content: string) => void;
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
  externalRevision: 0,

  setFiles: (files) => set({ files }),
  setActiveFile: (path) => set({ activeFile: path }),
  setContent: (content) => set({ content, dirty: true }),
  setContentExternal: (content) =>
    set((s) => ({
      content,
      dirty: false,
      externalRevision: s.externalRevision + 1,
    })),
  setDirty: (dirty) => set({ dirty }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSaving: (saving) => set({ saving }),
}));
