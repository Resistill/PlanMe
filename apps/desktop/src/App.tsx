import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { Editor } from "./components/Editor/Editor";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { StatusBar } from "./components/StatusBar/StatusBar";
import {
  CommandPalette,
  type Command,
} from "./components/CommandPalette/CommandPalette";
import { Settings } from "./components/Settings/Settings";
import { useEditorStore } from "./stores/editorStore";
import { useSyncStore } from "./stores/syncStore";
import { useThemeStore } from "./stores/themeStore";
import { useStickerStore } from "./stores/stickerStore";
import { listen } from "@tauri-apps/api/event";
import { useFileManager } from "./hooks/useFileManager";
import { useSync } from "./hooks/useSync";
import { syncManager } from "./lib/sync/syncManager";

function useIsMobile() {
  const [isMobile] = useState(
    () => window.innerWidth <= 768 || navigator.maxTouchPoints > 0,
  );
  return isMobile;
}

function MobileTopBar({
  filename,
  onBack,
  onCommandPalette,
}: {
  filename: string | null;
  onBack: () => void;
  onCommandPalette: () => void;
}) {
  return (
    <div className="mobile-top-bar">
      <button className="mobile-top-bar-btn" onClick={onBack} title="Back">
        ←
      </button>
      <span className="mobile-top-bar-title">{filename ?? "PlanMe"}</span>
      <button
        className="mobile-top-bar-btn"
        onClick={onCommandPalette}
        title="Command Palette"
      >
        ⌘
      </button>
    </div>
  );
}

function App() {
  const isMobile = useIsMobile();
  const { content, activeFile, files, dirty, saving, toggleSidebar } =
    useEditorStore();
  const { status: syncStatus } = useSyncStore();
  const { theme, toggleTheme } = useThemeStore();
  const { stickerMode, toggleStickerMode } = useStickerStore();
  const { openFile, save, newFile, removeFile } = useFileManager();
  const { forceSync, pushCurrentFile } = useSync();
  const [stickerOpacity, setStickerOpacity] = useState(1.0);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Toggle sticker mode body class for transparent background
  useEffect(() => {
    document.body.classList.toggle("sticker-mode", stickerMode);
  }, [stickerMode]);
  // Listen for sticker mode events from Rust backend
  useEffect(() => {
    const unlistenMode = listen<boolean>("sticker-mode-changed", (event) => {
      useStickerStore.getState().setStickerModeLocal(event.payload);
    });
    const unlistenOpacity = listen<number>("sticker-opacity", (event) => {
      setStickerOpacity(event.payload);
    });
    // Restore sticker mode when backend signals ready (global shortcut registered)
    const unlistenReady = listen("app-ready", () => {
      useStickerStore.getState().restoreStickerMode();
    });
    return () => {
      unlistenMode.then((fn) => fn());
      unlistenOpacity.then((fn) => fn());
      unlistenReady.then((fn) => fn());
    };
  }, []);

  const [mobileView, setMobileView] = useState<"sidebar" | "editor">("sidebar");
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const [editorKey, setEditorKey] = useState(0);

  // Build command list
  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = [
      {
        id: "new-file",
        label: "New Plan",
        shortcut: "Ctrl+N",
        action: () => setShowNewFileDialog(true),
      },
      {
        id: "save",
        label: "Save",
        shortcut: "Ctrl+S",
        action: () => save(),
      },
      ...(!isMobile
        ? [
            {
              id: "toggle-sidebar",
              label: "Toggle Sidebar",
              shortcut: "Ctrl+B",
              action: () => toggleSidebar(),
            },
          ]
        : []),
      {
        id: "settings",
        label: "Settings (Sync Server)",
        action: () => setShowSettings(true),
      },
      {
        id: "toggle-theme",
        label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Theme`,
        action: () => toggleTheme(),
      },
      {
        id: "force-sync",
        label: "Force Sync Now",
        shortcut: "Ctrl+Shift+S",
        action: () => forceSync(),
      },
      ...(!isMobile
        ? [
            {
              id: "toggle-sticker",
              label: stickerMode ? "Exit Sticker Mode" : "Enter Sticker Mode",
              shortcut: "Ctrl+Alt+T",
              action: () => toggleStickerMode(),
            },
          ]
        : []),
    ];

    // Add file open commands
    for (const file of files) {
      cmds.push({
        id: `open-${file.path}`,
        label: `Open: ${file.filename}`,
        action: () => {
          openFile(file.path);
          setEditorKey((k) => k + 1);
        },
      });
    }

    // Delete current file
    if (activeFile) {
      cmds.push({
        id: "delete-file",
        label: "Delete Current Plan",
        action: () => {
          if (confirm("Delete this plan?")) {
            removeFile(activeFile);
          }
        },
      });
    }

    return cmds;
  }, [files, activeFile, save, toggleSidebar, openFile, removeFile, stickerMode, toggleStickerMode, isMobile]);

  // Restore sync config from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("planme-sync-config");
      if (saved) {
        const config = JSON.parse(saved);
        if (config.serverUrl && config.apiKey) {
          useSyncStore.getState().setConfig(config);
          syncManager.configure(config);
          syncManager.onStateChange((state) => {
            useSyncStore.getState().setStatus(state.status);
            useSyncStore.getState().setLastSyncAt(state.lastSyncAt);
            useSyncStore.getState().setError(state.error);
          });
        }
      }
    } catch {}
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      }
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        setShowCommandPalette(true);
      }
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        forceSync();
        return;
      }
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        save().then(() => pushCurrentFile());
      }
      if (e.ctrlKey && e.key === "n") {
        e.preventDefault();
        setShowNewFileDialog(true);
      }
      if (e.ctrlKey && e.altKey && e.key === "t") {
        e.preventDefault();
        toggleStickerMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, save]);

  useEffect(() => {
    if (showNewFileDialog) {
      setTimeout(() => newFileInputRef.current?.focus(), 50);
    }
  }, [showNewFileDialog]);

  const handleFileSelect = useCallback(
    async (file: { path: string }) => {
      await openFile(file.path);
      setEditorKey((k) => k + 1);
      if (isMobile) setMobileView("editor");
    },
    [openFile, isMobile],
  );

  const handleNewFile = useCallback(() => {
    setShowNewFileDialog(true);
  }, []);

  const handleCreateFile = useCallback(async () => {
    const name = newFileName.trim();
    if (!name) return;
    try {
      await newFile(name);
      setEditorKey((k) => k + 1);
      setShowNewFileDialog(false);
      setNewFileName("");
      if (isMobile) setMobileView("editor");
    } catch (err: any) {
      alert(err.message || "Failed to create file");
    }
  }, [newFileName, newFile]);

  const activeFilename = activeFile
    ? files.find((f) => f.path === activeFile)?.filename ?? "Untitled"
    : null;

  const lineCount = content.split("\n").length;

  const dialogs = (
    <>
      <Settings open={showSettings} onClose={() => setShowSettings(false)} />
      <CommandPalette
        commands={commands}
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
      {showNewFileDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowNewFileDialog(false)}
        >
          <div
            style={{
              background: "#1e1e2e",
              border: "1px solid #45475a",
              borderRadius: 8,
              padding: 24,
              minWidth: 320,
              width: "90%",
              maxWidth: 400,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>
              New Plan
            </div>
            <input
              ref={newFileInputRef}
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateFile();
                if (e.key === "Escape") setShowNewFileDialog(false);
              }}
              placeholder="Filename (e.g. Weekly Plan)"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#313244",
                border: "1px solid #45475a",
                borderRadius: 6,
                color: "#cdd6f4",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 16,
              }}
            >
              <button
                onClick={() => setShowNewFileDialog(false)}
                style={{
                  padding: "6px 16px",
                  background: "none",
                  border: "1px solid #45475a",
                  borderRadius: 6,
                  color: "#cdd6f4",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                style={{
                  padding: "6px 16px",
                  background: "#89b4fa",
                  border: "none",
                  borderRadius: 6,
                  color: "#1e1e2e",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Mobile layout: single-page navigation (sidebar ↔ editor)
  if (isMobile) {
    if (mobileView === "sidebar") {
      return (
        <div style={{ height: "100%", width: "100%" }}>
          <Sidebar
            onFileSelect={handleFileSelect}
            onNewFile={handleNewFile}
            forceOpen
            fullscreen
          />
          {dialogs}
        </div>
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
        }}
      >
        <MobileTopBar
          filename={activeFilename}
          onBack={() => setMobileView("sidebar")}
          onCommandPalette={() => setShowCommandPalette(true)}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {activeFile ? (
            <Editor
              key={editorKey}
              initialContent={content}
              onChange={(c) => useEditorStore.getState().setContent(c)}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6c7086",
                fontSize: 16,
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div>No file selected</div>
            </div>
          )}
        </div>
        {dialogs}
      </div>
    );
  }

  // Desktop layout
  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        ...(stickerMode
          ? {
              background: `rgba(30, 30, 46, ${stickerOpacity})`,
              border: "2px solid #89b4fa",
              boxSizing: "border-box" as const,
              borderRadius: 8,
            }
          : {}),
      }}
    >
      <Sidebar onFileSelect={handleFileSelect} onNewFile={handleNewFile} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {activeFile ? (
          <Editor
            key={editorKey}
            initialContent={content}
            onChange={(c) => useEditorStore.getState().setContent(c)}
          />
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6c7086",
              fontSize: 16,
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div>Select a file or press Ctrl+N to create one</div>
            <div style={{ fontSize: 13, color: "#585b70" }}>
              Ctrl+K for command palette
            </div>
          </div>
        )}

        {!stickerMode && (
          <StatusBar
            filename={activeFilename}
            lineCount={activeFile ? lineCount : 0}
            syncStatus={syncStatus}
            dirty={dirty}
            saving={saving}
          />
        )}
      </div>

      <Settings open={showSettings} onClose={() => setShowSettings(false)} />

      <CommandPalette
        commands={commands}
        open={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />

      {/* Sticker Mode Indicator */}
      {stickerMode && (
        <div
          style={{
            position: "fixed",
            bottom: 8,
            right: 8,
            padding: "4px 10px",
            background: "rgba(137, 180, 250, 0.15)",
            border: "1px solid rgba(137, 180, 250, 0.3)",
            borderRadius: 6,
            color: "#89b4fa",
            fontSize: 11,
            pointerEvents: "none",
            zIndex: 9999,
          }}
        >
          Sticker Mode · Ctrl+Alt+T to exit
        </div>
      )}

    </div>
  );
}

export default App;
