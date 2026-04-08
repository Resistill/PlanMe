import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import {
  listFiles,
  readFile,
  saveFile,
  createFile,
  deleteFile,
  ensureWelcomeFile,
} from "../lib/fileManager";
import type { FileEntry } from "../stores/editorStore";

interface UseFileManagerOptions {
  onAfterSave?: (file: FileEntry, content: string) => Promise<void> | void;
  onAfterOpen?: (file: FileEntry) => Promise<void> | void;
  onAfterDelete?: (filename: string) => Promise<void> | void;
}

export function useFileManager(options: UseFileManagerOptions = {}) {
  const {
    activeFile,
    content,
    dirty,
    setFiles,
    setActiveFile,
    setContent,
    setDirty,
    setSaving,
  } = useEditorStore();
  const { onAfterSave, onAfterOpen, onAfterDelete } = options;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Load file list on mount
  const refreshFiles = useCallback(async () => {
    try {
      await ensureWelcomeFile();
      const files = await listFiles();
      setFiles(files);
      return files;
    } catch (err) {
      console.error("Failed to list files:", err);
      return [];
    }
  }, [setFiles]);

  // Open a file
  const openFile = useCallback(
    async (path: string) => {
      const currentFile = activeFile
        ? useEditorStore.getState().files.find((file) => file.path === activeFile) ?? null
        : null;

      // Save current file first if dirty
      if (activeFile && dirty && currentFile) {
        await saveFile(activeFile, contentRef.current);
        setDirty(false);
        await onAfterSave?.(currentFile, contentRef.current);
      }

      try {
        const text = await readFile(path);
        const nextFile = useEditorStore
          .getState()
          .files.find((file) => file.path === path);
        setActiveFile(path);
        setContent(text);
        setDirty(false);
        if (nextFile) {
          await onAfterOpen?.(nextFile);
        }
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },
    [activeFile, dirty, onAfterOpen, onAfterSave, setActiveFile, setContent, setDirty],
  );

  // Save current file
  const save = useCallback(async () => {
    if (!activeFile || !dirty) return;
    setSaving(true);
    try {
      const file = useEditorStore.getState().files.find((entry) => entry.path === activeFile);
      await saveFile(activeFile, contentRef.current);
      setDirty(false);
      await refreshFiles();
      if (file) {
        await onAfterSave?.(file, contentRef.current);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }, [activeFile, dirty, onAfterSave, setSaving, setDirty, refreshFiles]);

  // Create new file
  const newFile = useCallback(
    async (filename: string) => {
      try {
        const path = await createFile(filename);
        await refreshFiles();
        await openFile(path);
        return path;
      } catch (err) {
        console.error("Failed to create file:", err);
        throw err;
      }
    },
    [refreshFiles, openFile],
  );

  // Delete a file
  const removeFile = useCallback(
    async (path: string) => {
      try {
        const file = useEditorStore.getState().files.find((entry) => entry.path === path);
        await deleteFile(path);
        if (activeFile === path) {
          setActiveFile(null);
          setContent("");
          setDirty(false);
        }
        await refreshFiles();
        if (file) {
          await onAfterDelete?.(file.filename);
        }
      } catch (err) {
        console.error("Failed to delete file:", err);
      }
    },
    [activeFile, onAfterDelete, setActiveFile, setContent, setDirty, refreshFiles],
  );

  // Auto-save with debounce (5 seconds)
  useEffect(() => {
    if (!dirty || !activeFile) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      save();
    }, 5000);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [dirty, activeFile, content, save]);

  // Init: load files and open first one
  useEffect(() => {
    (async () => {
      const files = await refreshFiles();
      if (files.length > 0 && !activeFile) {
        await openFile(files[0].path);
      }
    })();
  }, []);

  return { refreshFiles, openFile, save, newFile, removeFile };
}
