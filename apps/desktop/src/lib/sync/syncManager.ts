import { SyncClient, type SyncConfig } from "./client";

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: string | null;
  error: string | null;
}

type SyncListener = (state: SyncState) => void;

export class SyncManager {
  private client: SyncClient | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private state: SyncState = {
    status: "offline",
    lastSyncAt: null,
    error: null,
  };
  private listeners: SyncListener[] = [];

  configure(config: SyncConfig) {
    this.client = new SyncClient(config);
    this.setState({ status: "idle", error: null });
  }

  onStateChange(listener: SyncListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private setState(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.state));
  }

  getState(): SyncState {
    return this.state;
  }

  getClient(): SyncClient | null {
    return this.client;
  }

  async pushDocument(
    documentId: string,
    content: string,
    baseRevision: number,
  ) {
    if (!this.client) return null;

    this.setState({ status: "syncing" });

    try {
      const result = await this.client.push(documentId, content, baseRevision);
      this.setState({
        status: "idle",
        lastSyncAt: new Date().toISOString(),
        error: null,
      });
      return result;
    } catch (err: any) {
      this.setState({
        status: "error",
        error: err.message,
      });
      return null;
    }
  }

  async pullDocument(documentId: string, lastKnownRevision: number) {
    if (!this.client) return null;

    this.setState({ status: "syncing" });

    try {
      const result = await this.client.pull(documentId, lastKnownRevision);
      this.setState({
        status: "idle",
        lastSyncAt: new Date().toISOString(),
        error: null,
      });
      return result;
    } catch (err: any) {
      this.setState({
        status: "error",
        error: err.message,
      });
      return null;
    }
  }

  startPeriodicSync(callback: () => Promise<void>, intervalMs = 60000) {
    this.stopPeriodicSync();
    this.intervalId = setInterval(callback, intervalMs);
  }

  stopPeriodicSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  disconnect() {
    this.stopPeriodicSync();
    this.client = null;
    this.setState({ status: "offline", error: null });
  }
}

// Singleton instance
export const syncManager = new SyncManager();
