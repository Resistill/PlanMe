import { create } from "zustand";
import type { SyncStatus } from "../lib/sync/syncManager";

interface SyncStoreState {
  status: SyncStatus;
  serverUrl: string;
  apiKey: string;
  lastSyncAt: string | null;
  error: string | null;

  setStatus: (status: SyncStatus) => void;
  setServerUrl: (url: string) => void;
  setApiKey: (key: string) => void;
  setLastSyncAt: (time: string | null) => void;
  setError: (error: string | null) => void;
  setConfig: (config: { serverUrl: string; apiKey: string }) => void;
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  status: "offline",
  serverUrl: "",
  apiKey: "",
  lastSyncAt: null,
  error: null,

  setStatus: (status) => set({ status }),
  setServerUrl: (serverUrl) => set({ serverUrl }),
  setApiKey: (apiKey) => set({ apiKey }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setError: (error) => set({ error }),
  setConfig: (config) => set(config),
}));
