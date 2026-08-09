import {
  mkdir,
  readDir,
  readTextFile,
  writeTextFile,
  remove,
  exists,
  rename,
  stat,
} from "@tauri-apps/plugin-fs";
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

  const names = entries
    .map((entry) => entry.name)
    .filter((name): name is string => !!name && name.endsWith(".md"));

  const withTime = await Promise.all(
    names.map(async (name) => {
      const filePath = await join(dir, name);
      let modifiedAt = 0;
      try {
        const info = await stat(filePath);
        const ms = info.mtime?.getTime() ?? info.birthtime?.getTime() ?? 0;
        modifiedAt = Number.isFinite(ms) ? ms : 0;
      } catch {
        // stat failed (e.g. file vanished mid-listing) — sort it to the bottom
      }
      const file: FileEntry = {
        filename: name,
        path: filePath,
        updatedAt: new Date(modifiedAt || Date.now()).toISOString(),
      };
      return { file, modifiedAt };
    }),
  );

  // Most recently modified first; fall back to filename when timestamps tie
  withTime.sort(
    (a, b) => b.modifiedAt - a.modifiedAt || a.file.filename.localeCompare(b.file.filename),
  );
  return withTime.map((entry) => entry.file);
}

export async function readFile(filePath: string): Promise<string> {
  return await readTextFile(filePath);
}

export async function saveFile(filePath: string, content: string): Promise<void> {
  await writeTextFile(filePath, content);
}

interface CreateFileOptions {
  /**
   * 是否拒绝"仅大小写不同"的重名。
   *
   * 用户手动新建时为 true：Windows 文件系统不区分大小写而 Android 区分，
   * 允许建出 Daily.md + daily.md 会让两端互相覆盖。
   *
   * 同步下行时必须为 false —— 服务端可能已经存在这样一对文档，这时要如实
   * 落地，不能因为查重把其中一篇静默丢掉。
   */
  rejectCaseVariants?: boolean;
}

export async function createFile(
  filename: string,
  { rejectCaseVariants = true }: CreateFileOptions = {},
): Promise<string> {
  if (!filename.endsWith(".md")) {
    filename += ".md";
  }
  const dir = await getPlansDir();
  const filePath = await join(dir, filename);

  if (rejectCaseVariants) {
    const entries = await readDir(dir);
    const lower = filename.toLowerCase();
    const clash = entries.find((entry) => entry.name?.toLowerCase() === lower);
    if (clash) {
      throw new Error(`File "${clash.name}" already exists`);
    }
  }

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

  // 只在一个笔记都没有时才生成。原来是"Welcome.md 不存在就重建"，而
  // refreshFiles() 在每次保存/删除后都会调用它 —— 结果 Welcome.md 删不掉，
  // 删完立刻又被写回来，还会同步到服务器。
  const entries = await readDir(dir);
  const hasNotes = entries.some((entry) => entry.name?.endsWith(".md"));
  if (hasNotes) return;

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
