import { useState, useMemo } from "react";
import { useEditorStore, type FileEntry } from "../../stores/editorStore";
import "./sidebar.css";

interface SidebarProps {
  onFileSelect: (file: FileEntry) => void;
  onNewFile: () => void;
  forceOpen?: boolean;
  fullscreen?: boolean;
}

export function Sidebar({ onFileSelect, onNewFile, forceOpen, fullscreen }: SidebarProps) {
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
        <button
          className="sidebar-btn"
          onClick={onNewFile}
          title="New file (Ctrl+N)"
        >
          +
        </button>
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
                <span className="file-date">
                  {new Date(file.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
