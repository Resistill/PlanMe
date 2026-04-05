export interface SyncConfig {
  serverUrl: string;
  apiKey: string;
}

export interface SyncDocument {
  id: string;
  filename: string;
  revision: number;
  updatedAt: string;
}

export interface PushResult {
  ok: boolean;
  newRevision?: number;
  conflict?: boolean;
  serverContent?: string;
  serverRevision?: number;
}

export interface PullResult {
  noChange?: boolean;
  content?: string;
  metadata?: string;
  revision?: number;
  updatedAt?: string;
}

export class SyncClient {
  private config: SyncConfig;

  constructor(config: SyncConfig) {
    this.config = config;
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.serverUrl}${path}`;
    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
        ...options.headers,
      },
    });
  }

  async registerDevice(name: string): Promise<{ id: string; apiKey: string }> {
    const res = await fetch(`${this.config.serverUrl}/api/auth/register-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) throw new Error(`Registration failed: ${res.statusText}`);
    return res.json();
  }

  async listDocuments(): Promise<SyncDocument[]> {
    const res = await this.fetch("/api/documents");
    if (!res.ok) throw new Error(`List documents failed: ${res.statusText}`);
    const data = await res.json();
    return data.documents;
  }

  async getDocument(id: string): Promise<{
    id: string;
    filename: string;
    content: string;
    revision: number;
  }> {
    const res = await this.fetch(`/api/documents/${id}`);
    if (!res.ok) throw new Error(`Get document failed: ${res.statusText}`);
    return res.json();
  }

  async createDocument(
    filename: string,
    content: string,
  ): Promise<{ id: string; revision: number }> {
    const res = await this.fetch("/api/documents", {
      method: "POST",
      body: JSON.stringify({ filename, content }),
    });
    if (!res.ok) throw new Error(`Create document failed: ${res.statusText}`);
    return res.json();
  }

  async push(
    documentId: string,
    content: string,
    baseRevision: number,
  ): Promise<PushResult> {
    const res = await this.fetch("/api/sync/push", {
      method: "POST",
      body: JSON.stringify({ documentId, content, baseRevision }),
    });
    if (!res.ok) throw new Error(`Push failed: ${res.statusText}`);
    return res.json();
  }

  async pull(
    documentId: string,
    lastKnownRevision: number,
  ): Promise<PullResult> {
    const res = await this.fetch("/api/sync/pull", {
      method: "POST",
      body: JSON.stringify({ documentId, lastKnownRevision }),
    });
    if (!res.ok) throw new Error(`Pull failed: ${res.statusText}`);
    return res.json();
  }

  async getStatus(): Promise<SyncDocument[]> {
    const res = await this.fetch("/api/sync/status");
    if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
    const data = await res.json();
    return data.documents;
  }
}
