import { useCallback, useEffect, useRef } from "react";
import { useEditorStore } from "../stores/editorStore";
import { useSyncStore } from "../stores/syncStore";
import { syncManager } from "../lib/sync/syncManager";
import {
  getTrackedDocs,
  removeTrackedDoc,
  setTrackedDoc,
} from "../lib/sync/revisionTracker";
import {
  createFile,
  deleteFile,
  listFiles,
  readFile,
  saveFile,
} from "../lib/fileManager";

export function useSync() {
  const { serverUrl, apiKey } = useSyncStore();
  const syncingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configured = Boolean(serverUrl && apiKey);

  const fullSync = useCallback(async () => {
    if (!configured || syncingRef.current) return;
    const client = syncManager.getClient();
    if (!client) return;

    syncingRef.current = true;
    useSyncStore.getState().setStatus("syncing");

    try {
      const serverDocs = await client.listDocuments();
      const localFiles = await listFiles();
      const tracked = getTrackedDocs();

      const serverByFilename = new Map(serverDocs.map((doc) => [doc.filename, doc]));
      const localByFilename = new Map(localFiles.map((file) => [file.filename, file]));

      for (const serverDoc of serverDocs) {
        const localFile = localByFilename.get(serverDoc.filename);
        const trackedInfo = tracked[serverDoc.filename];

        if (serverDoc.deletedAt) {
          if (localFile) {
            if (trackedInfo && trackedInfo.lastModified <= serverDoc.deletedAt) {
              await deleteFile(localFile.path);
              clearActiveFileIfDeleted(localFile.path);
              removeTrackedDoc(serverDoc.filename);
            } else if (trackedInfo) {
              const content = await readFile(localFile.path);
              await client.restoreDocument(serverDoc.id);
              const result = await client.push(
                serverDoc.id,
                content,
                serverDoc.revision,
              );

              if (result.ok && result.newRevision) {
                setTrackedDoc(serverDoc.filename, {
                  docId: serverDoc.id,
                  revision: result.newRevision,
                  lastModified: new Date().toISOString(),
                });
              }
            }
          } else {
            removeTrackedDoc(serverDoc.filename);
          }

          continue;
        }

        if (!localFile) {
          const fullDoc = await client.getDocument(serverDoc.id);
          await createFileFromSync(serverDoc.filename, fullDoc.content);
          setTrackedDoc(serverDoc.filename, {
            docId: serverDoc.id,
            revision: serverDoc.revision,
            lastModified: new Date().toISOString(),
          });
        } else if (trackedInfo) {
          if (serverDoc.revision > trackedInfo.revision) {
            const fullDoc = await client.getDocument(serverDoc.id);
            await saveFile(localFile.path, fullDoc.content);
            setTrackedDoc(serverDoc.filename, {
              docId: serverDoc.id,
              revision: fullDoc.revision,
              lastModified: new Date().toISOString(),
            });

            const { activeFile, setContent, setDirty } = useEditorStore.getState();
            if (activeFile === localFile.path) {
              setContent(fullDoc.content);
              setDirty(false);
            }
          }
        } else {
          const content = await readFile(localFile.path);
          const fullDoc = await client.getDocument(serverDoc.id);

          if (fullDoc.content === content) {
            setTrackedDoc(serverDoc.filename, {
              docId: serverDoc.id,
              revision: serverDoc.revision,
              lastModified: new Date().toISOString(),
            });
          } else {
            const result = await client.push(serverDoc.id, content, serverDoc.revision);

            if (result.ok && result.newRevision) {
              setTrackedDoc(serverDoc.filename, {
                docId: serverDoc.id,
                revision: result.newRevision,
                lastModified: new Date().toISOString(),
              });
            } else if (result.conflict && result.serverContent && result.serverRevision) {
              await saveFile(localFile.path, result.serverContent);
              setTrackedDoc(serverDoc.filename, {
                docId: serverDoc.id,
                revision: result.serverRevision,
                lastModified: new Date().toISOString(),
              });

              const { activeFile, setContent, setDirty } = useEditorStore.getState();
              if (activeFile === localFile.path) {
                setContent(result.serverContent);
                setDirty(false);
              }
            }
          }
        }
      }

      for (const localFile of localFiles) {
        if (!serverByFilename.has(localFile.filename)) {
          const trackedInfo = tracked[localFile.filename];

          if (trackedInfo) {
            await deleteFile(localFile.path);
            clearActiveFileIfDeleted(localFile.path);
            removeTrackedDoc(localFile.filename);
          } else {
            const content = await readFile(localFile.path);
            const result = await client.createDocument(localFile.filename, content);
            setTrackedDoc(localFile.filename, {
              docId: result.id,
              revision: result.revision,
              lastModified: new Date().toISOString(),
            });
          }
        }
      }

      const files = await listFiles();
      useEditorStore.getState().setFiles(files);

      useSyncStore.getState().setStatus("idle");
      useSyncStore.getState().setLastSyncAt(new Date().toISOString());
      useSyncStore.getState().setError(null);
    } catch (err) {
      useSyncStore.getState().setStatus("error");
      useSyncStore.getState().setError(getErrorMessage(err));
    } finally {
      syncingRef.current = false;
    }
  }, [configured]);

  const pushFile = useCallback(
    async (filename: string, filePath: string, content: string) => {
      if (!configured) return;

      const client = syncManager.getClient();
      if (!client) return;

      const tracked = getTrackedDocs();
      const trackedInfo = tracked[filename];

      try {
        if (!trackedInfo) {
          const result = await client.createDocument(filename, content);
          setTrackedDoc(filename, {
            docId: result.id,
            revision: result.revision,
            lastModified: new Date().toISOString(),
          });
        } else {
          const result = await client.push(
            trackedInfo.docId,
            content,
            trackedInfo.revision,
          );

          if (result.ok && result.newRevision) {
            setTrackedDoc(filename, {
              docId: trackedInfo.docId,
              revision: result.newRevision,
              lastModified: new Date().toISOString(),
            });
          } else if (result.conflict) {
            const keepLocal = confirm(
              "Sync conflict detected. Another device has modified this file.\n\n" +
                "Click OK to keep your local version, or Cancel to use the server version.",
            );

            if (!keepLocal && result.serverContent && result.serverRevision) {
              useEditorStore.getState().setContent(result.serverContent);
              await saveFile(filePath, result.serverContent);
              useEditorStore.getState().setDirty(false);
              setTrackedDoc(filename, {
                docId: trackedInfo.docId,
                revision: result.serverRevision,
                lastModified: new Date().toISOString(),
              });
            } else if (result.serverRevision) {
              const retry = await client.push(
                trackedInfo.docId,
                content,
                result.serverRevision,
              );

              if (retry.ok && retry.newRevision) {
                setTrackedDoc(filename, {
                  docId: trackedInfo.docId,
                  revision: retry.newRevision,
                  lastModified: new Date().toISOString(),
                });
              }
            }
          }
        }

        useSyncStore.getState().setStatus("idle");
        useSyncStore.getState().setLastSyncAt(new Date().toISOString());
        useSyncStore.getState().setError(null);
      } catch (err) {
        console.error("Push failed:", getErrorMessage(err));
      }
    },
    [configured],
  );

  const pullFile = useCallback(async (filename: string, filePath: string) => {
    if (!configured) return;

    const client = syncManager.getClient();
    if (!client) return;

    const tracked = getTrackedDocs();
    const trackedInfo = tracked[filename];
    if (!trackedInfo) return;

    try {
      const result = await client.pull(trackedInfo.docId, trackedInfo.revision);

      if (result.content && !result.noChange) {
        await saveFile(filePath, result.content);
        setTrackedDoc(filename, {
          docId: trackedInfo.docId,
          revision: result.revision ?? trackedInfo.revision,
          lastModified: new Date().toISOString(),
        });

        const { activeFile, setContent, setDirty } = useEditorStore.getState();
        if (activeFile === filePath) {
          setContent(result.content);
          setDirty(false);
        }
      }
    } catch {
      // Silent fail, will retry on next sync
    }
  }, [configured]);

  const syncDelete = useCallback(async (filename: string) => {
    if (!configured) return;

    const client = syncManager.getClient();
    if (!client) return;

    const tracked = getTrackedDocs();
    const trackedInfo = tracked[filename];
    if (!trackedInfo) return;

    try {
      await client.softDelete(trackedInfo.docId);
      removeTrackedDoc(filename);
    } catch {
      // Silent fail
    }
  }, [configured]);

  const forceSync = useCallback(async () => {
    await fullSync();
  }, [fullSync]);

  useEffect(() => {
    if (!configured) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    fullSync();

    intervalRef.current = setInterval(() => {
      fullSync();
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [configured, fullSync]);

  return { pushFile, pullFile, syncDelete, forceSync, fullSync, configured };
}

function clearActiveFileIfDeleted(filePath: string) {
  const { activeFile, setActiveFile, setContent, setDirty } = useEditorStore.getState();

  if (activeFile !== filePath) {
    return;
  }

  setActiveFile(null);
  setContent("");
  setDirty(false);
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

async function createFileFromSync(filename: string, content: string): Promise<void> {
  try {
    await createFile(filename);
  } catch {
    // File might already exist
  }

  const files = await listFiles();
  const file = files.find((entry) => entry.filename === filename);
  if (file) {
    await saveFile(file.path, content);
  }
}
