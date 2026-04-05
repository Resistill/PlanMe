import { useState, useEffect, useRef } from "react";
import { useSyncStore } from "../../stores/syncStore";
import { useThemeStore } from "../../stores/themeStore";
import { SyncClient } from "../../lib/sync/client";
import { syncManager } from "../../lib/sync/syncManager";
import "./settings.css";

// Lazy-loaded autostart API
async function getAutostartApi() {
  try {
    return await import("@tauri-apps/plugin-autostart");
  } catch {
    return null;
  }
}

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

export function Settings({ open, onClose }: SettingsProps) {
  const { serverUrl, apiKey, status, lastSyncAt, error, setConfig, setStatus, setError } =
    useSyncStore();
  const [url, setUrl] = useState(serverUrl);
  const [key, setKey] = useState(apiKey);
  const [deviceName, setDeviceName] = useState("");
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [autostart, setAutostart] = useState(false);
  const [autostartAvailable, setAutostartAvailable] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrl(serverUrl);
      setKey(apiKey);
      setMessage("");
      setTimeout(() => inputRef.current?.focus(), 50);
      // Check autostart status
      getAutostartApi().then((api) => {
        if (api) {
          setAutostartAvailable(true);
          api.isEnabled().then(setAutostart).catch(() => {});
        }
      });
    }
  }, [open, serverUrl, apiKey]);

  const handleToggleAutostart = async () => {
    const api = await getAutostartApi();
    if (!api) return;
    try {
      if (autostart) {
        await api.disable();
        setAutostart(false);
      } else {
        await api.enable();
        setAutostart(true);
      }
    } catch (err: any) {
      setMessage(`Autostart error: ${err.message}`);
    }
  };

  const handleRegisterDevice = async () => {
    if (!url || !deviceName) {
      setMessage("Please enter server URL and device name");
      return;
    }
    setRegistering(true);
    setMessage("");
    try {
      const client = new SyncClient({ serverUrl: url, apiKey: "" });
      const result = await client.registerDevice(deviceName);
      setKey(result.apiKey);
      setMessage(`Registered! API Key: ${result.apiKey}`);
    } catch (err: any) {
      setMessage(`Failed: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleSave = () => {
    setConfig({ serverUrl: url, apiKey: key });

    if (url && key) {
      syncManager.configure({ serverUrl: url, apiKey: key });
      setStatus("idle");
      // Persist config to localStorage
      localStorage.setItem(
        "planme-sync-config",
        JSON.stringify({ serverUrl: url, apiKey: key }),
      );
      setMessage("Connected!");
    } else {
      syncManager.disconnect();
      setStatus("offline");
      localStorage.removeItem("planme-sync-config");
      setMessage("Disconnected");
    }

    setTimeout(onClose, 500);
  };

  const handleDisconnect = () => {
    setUrl("");
    setKey("");
    setConfig({ serverUrl: "", apiKey: "" });
    syncManager.disconnect();
    setStatus("offline");
    localStorage.removeItem("planme-sync-config");
    setMessage("Disconnected");
  };

  if (!open) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <span>Settings</span>
          <button className="settings-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">General</div>

          <div className="settings-row">
            <span className="settings-row-label">Theme</span>
            <button className="settings-btn" onClick={toggleTheme}>
              {theme === "dark" ? "Dark" : "Light"} (click to switch)
            </button>
          </div>

          {autostartAvailable && (
            <div className="settings-row">
              <span className="settings-row-label">Launch on startup</span>
              <button
                className={`settings-toggle ${autostart ? "active" : ""}`}
                onClick={handleToggleAutostart}
              >
                {autostart ? "ON" : "OFF"}
              </button>
            </div>
          )}

          <div className="settings-divider" />

          <div className="settings-section-title">Sync Server</div>

          <label className="settings-label">Server URL</label>
          <input
            ref={inputRef}
            type="text"
            className="settings-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:3847"
          />

          <label className="settings-label">API Key</label>
          <input
            type="text"
            className="settings-input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="pm_..."
          />

          <div className="settings-divider" />

          <div className="settings-section-title">Register New Device</div>
          <label className="settings-label">Device Name</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              className="settings-input"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="My PC"
              style={{ flex: 1 }}
            />
            <button
              className="settings-btn-primary"
              onClick={handleRegisterDevice}
              disabled={registering}
            >
              {registering ? "..." : "Register"}
            </button>
          </div>
        </div>

        {message && <div className="settings-message">{message}</div>}

        <div className="settings-footer">
          {serverUrl && apiKey && (
            <button className="settings-btn-danger" onClick={handleDisconnect}>
              Disconnect
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="settings-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
