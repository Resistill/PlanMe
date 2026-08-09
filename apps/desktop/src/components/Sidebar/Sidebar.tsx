import { useState, useMemo } from "react";
import { useEditorStore, type FileEntry } from "../../stores/editorStore";
import "./sidebar.css";

interface SidebarProps {
  onFileSelect: (file: FileEntry) => void;
  onNewFile: () => void;
  /** 移动端文件列表页没有顶栏，需要一个入口打开命令面板（设置/删除/同步都在里面） */
  onCommandPalette?: () => void;
  forceOpen?: boolean;
  fullscreen?: boolean;
}

// Files are ordered by last-modified time, so show the time for today's edits
function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString();
}

export function Sidebar({
  onFileSelect,
  onNewFile,
  onCommandPalette,
  forceOpen,
  fullscreen,
}: SidebarProps) {
  const { files, activeFile, sidebarOpen } = useEditorStore();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return files;
    const lower = search.toLowerCase();
    return files.filter((f) => f.filename.toLowerCase().includes(lower));
  }, [files, search]);

  if (!sidebarOpen && !forceOpen) return null;

  return (
    <div className={`sidebar${fullscreen ? " sidebar-fullscreen" : ""}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">PlanMe</span>
        <div className="sidebar-header-actions">
          {onCommandPalette && (
            <button
              className="sidebar-btn"
              onClick={onCommandPalette}
              title="Command Palette (Ctrl+K)"
            >
              ⌘
            </button>
          )}
          <button
            className="sidebar-btn"
            onClick={onNewFile}
            title="New file (Ctrl+N)"
          >
            +
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <input
          type="text"
          placeholder="Search files..."
          className="sidebar-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="sidebar-files">
        {filtered.length === 0 ? (
          <div className="sidebar-empty">
            {files.length === 0
              ? "No files yet. Create one with Ctrl+N"
              : "No matching files"}
          </div>
        ) : (
          filtered.map((file) => (
            <div
              key={file.path}
              className={`sidebar-file-item ${activeFile === file.path ? "active" : ""}`}
              onClick={() => onFileSelect(file)}
            >
              <span className="file-icon">&#128196;</span>
              <div className="file-info">
                <span className="file-name">{file.filename}</span>
                <span className="file-date">{formatUpdatedAt(file.updatedAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
