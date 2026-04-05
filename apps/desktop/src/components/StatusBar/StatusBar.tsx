import "./statusbar.css";

interface StatusBarProps {
  filename: string | null;
  lineCount: number;
  syncStatus: "idle" | "syncing" | "error" | "offline";
  dirty?: boolean;
  saving?: boolean;
}

export function StatusBar({
  filename,
  lineCount,
  syncStatus,
  dirty,
  saving,
}: StatusBarProps) {
  const syncLabel = {
    idle: "Synced",
    syncing: "Syncing...",
    error: "Sync Error",
    offline: "Offline",
  };

  const syncColor = {
    idle: "#a6e3a1",
    syncing: "#f9e2af",
    error: "#f38ba8",
    offline: "#6c7086",
  };

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span className="statusbar-filename">
          {filename || "No file"}
          {dirty && !saving ? " *" : ""}
          {saving ? " (saving...)" : ""}
        </span>
      </div>
      <div className="statusbar-right">
        {lineCount > 0 && (
          <span className="statusbar-lines">{lineCount} lines</span>
        )}
        <span
          className="statusbar-sync"
          style={{ color: syncColor[syncStatus] }}
        >
          {syncLabel[syncStatus]}
        </span>
      </div>
    </div>
  );
}
