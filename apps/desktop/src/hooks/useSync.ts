import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useSyncStore } from "../stores/syncStore";
import { syncManager } from "../lib/sync/syncManager";

// Map local filenames to server document IDs
function getDocMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem("planme-doc-map") || "{}");
  } catch {
    return {};
  }
}

function setDocMap(map: Record<string, string>) {
  localStorage.setItem("planme-doc-map", JSON.stringify(map));
}

export function useSync() {
  const { serverUrl, apiKey } = useSyncStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configured = Boolean(serverUrl && apiKey);

  // Push current file after save
  const pushCurrentFile = useCallback(async () => {
    if (!configured) return;

    const { activeFile, content, files } = useEditorStore.getState();
    if (!activeFile) return;

    const file = files.find((f) => f.path === activeFile);
    if (!file) return;

    const docMap = getDocMap();
    let docId = docMap[file.filename];

    const client = syncManager.getClient();
    if (!client) return;

    useSyncStore.getState().setStatus("syncing");

    try {
      if (!docId) {
        // First sync: create document on server
        const result = await client.createDocument(file.filename, content);
        docId = result.id;
        const map = getDocMap();
        map[file.filename] = docId;
        setDocMap(map);
      } else {
        // Push update
        const result = await client.push(docId, content, 0);
        if (result.conflict) {
          // Simple conflict resolution: ask user
          const keepLocal = confirm(
            "Sync conflict detected. Another device has modified this file.\n\n" +
              "Click OK to keep your local version, or Cancel to use the server version.",
          );

          if (!keepLocal && result.serverContent) {
            useEditorStore.getState().setContent(result.serverContent);
          } else {
            // Force push local version by creating new revision
            await client.push(docId, content, result.serverRevision!);
          }
        }
      }

      useSyncStore.getState().setStatus("idle");
      useSyncStore.getState().setLastSyncAt(new Date().toISOString());
      useSyncStore.getState().setError(null);
    } catch (err: any) {
      useSyncStore.getState().setStatus("error");
      useSyncStore.getState().setError(err.message);
    }
  }, [configured]);

  // Pull updates from server for current file
  const pullCurrentFile = useCallback(async () => {
    if (!configured) return;

    const { activeFile, files } = useEditorStore.getState();
    if (!activeFile) return;

    const file = files.find((f) => f.path === activeFile);
    if (!file) return;

    const docMap = getDocMap();
    const docId = docMap[file.filename];
    if (!docId) return;

    const client = syncManager.getClient();
    if (!client) return;

    try {
      const result = await client.pull(docId, 0);
      if (result.content && !result.noChange) {
        useEditorStore.getState().setContent(result.content);
      }
    } catch {
      // Silent fail on pull — will retry next interval
    }
  }, [configured]);

  // Force sync (Ctrl+Shift+S)
  const forceSync = useCallback(async () => {
    await pushCurrentFile();
  }, [pushCurrentFile]);

  // Start periodic sync
  useEffect(() => {
    if (!configured) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial pull on connect
    pullCurrentFile();

    // Periodic sync every 60s
    intervalRef.current = setInterval(() => {
      pushCurrentFile();
    }, 60000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [configured, pushCurrentFile, pullCurrentFile]);

  return { pushCurrentFile, pullCurrentFile, forceSync, configured };
}
