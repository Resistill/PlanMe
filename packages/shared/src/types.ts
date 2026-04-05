export interface TaskDocument {
  id: string;
  filename: string;
  content: string;
  tasks: TaskNode[];
  metadata: DocumentMeta;
}

export interface TaskNode {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  rawLine: string;
  lineNumber: number;
  completed: boolean;
  children: TaskNode[];
}

export interface DocumentMeta {
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
  serverRevision?: number;
}
