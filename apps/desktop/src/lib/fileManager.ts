import { mkdir, readDir, readTextFile, writeTextFile, remove, exists, rename } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { FileEntry } from "../stores/editorStore";

const PLANS_DIR = "plans";

let basePath: string | null = null;

async function getPlansDir(): Promise<string> {
  if (basePath) return basePath;
  const appData = await appDataDir();
  basePath = await join(appData, PLANS_DIR);

  if (!(await exists(basePath))) {
    await mkdir(basePath, { recursive: true });
  }

  return basePath;
}

export async function listFiles(): Promise<FileEntry[]> {
  const dir = await getPlansDir();
  const entries = await readDir(dir);

  const files: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.name && entry.name.endsWith(".md")) {
      const filePath = await join(dir, entry.name);
      files.push({
        filename: entry.name,
        path: filePath,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Sort by filename
  files.sort((a, b) => a.filename.localeCompare(b.filename));
  return files;
}

export async function readFile(filePath: string): Promise<string> {
  return await readTextFile(filePath);
}

export async function saveFile(filePath: string, content: string): Promise<void> {
  await writeTextFile(filePath, content);
}

export async function createFile(filename: string): Promise<string> {
  if (!filename.endsWith(".md")) {
    filename += ".md";
  }
  const dir = await getPlansDir();
  const filePath = await join(dir, filename);

  if (await exists(filePath)) {
    throw new Error(`File "${filename}" already exists`);
  }

  const defaultContent = `# ${filename.replace(/\.md$/, "")}\n\n`;
  await writeTextFile(filePath, defaultContent);
  return filePath;
}

export async function deleteFile(filePath: string): Promise<void> {
  await remove(filePath);
}

export async function renameFile(oldPath: string, newName: string): Promise<string> {
  if (!newName.endsWith(".md")) {
    newName += ".md";
  }
  const dir = await getPlansDir();
  const newPath = await join(dir, newName);
  await rename(oldPath, newPath);
  return newPath;
}

export async function ensureWelcomeFile(): Promise<void> {
  const dir = await getPlansDir();
  const welcomePath = await join(dir, "Welcome.md");

  if (!(await exists(welcomePath))) {
    const content = `# Welcome to PlanMe

## Getting Started
### Create your first plan
### Use # ## ### for task hierarchy
### Add √ to mark tasks complete

## Keyboard Shortcuts
### Ctrl+Enter — Toggle task completion
### Ctrl+Shift+Up/Down — Promote/demote task
### Ctrl+N — New file
### Ctrl+B — Toggle sidebar
### Ctrl+K — Command palette
### Ctrl+Alt+T — Sticker mode (pin + click-through)

## Example Tasks
### Read documentation √
### Set up project
### Start writing code
`;
    await writeTextFile(welcomePath, content);
  }
}
