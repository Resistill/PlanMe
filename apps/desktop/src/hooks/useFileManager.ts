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

export function useFileManager() {
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
      // Save current file first if dirty
      if (activeFile && dirty) {
        await saveFile(activeFile, contentRef.current);
        setDirty(false);
      }

      try {
        const text = await readFile(path);
        setActiveFile(path);
        setContent(text);
        setDirty(false);
      } catch (err) {
        console.error("Failed to open file:", err);
      }
    },
    [activeFile, dirty, setActiveFile, setContent, setDirty],
  );

  // Save current file
  const save = useCallback(async () => {
    if (!activeFile || !dirty) return;
    setSaving(true);
    try {
      await saveFile(activeFile, contentRef.current);
      setDirty(false);
      await refreshFiles();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }, [activeFile, dirty, setSaving, setDirty, refreshFiles]);

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
        await deleteFile(path);
        if (activeFile === path) {
          setActiveFile(null);
          setContent("");
          setDirty(false);
        }
        await refreshFiles();
      } catch (err) {
        console.error("Failed to delete file:", err);
      }
    },
    [activeFile, setActiveFile, setContent, setDirty, refreshFiles],
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
