import type { TaskNode } from "./types";

const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const COMPLETED_RE = /√\s*$/;
const CHECKBOX_CHECKED_RE = /^\s*-\s*\[x\]\s+/i;
const CHECKBOX_UNCHECKED_RE = /^\s*-\s*\[\s\]\s+/;

export function parseMarkdownToTasks(content: string): TaskNode[] {
  const lines = content.split("\n");
  const root: TaskNode[] = [];
  const stack: { level: number; node: TaskNode }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(HEADING_RE);

    if (!match) continue;

    const level = match[1].length as 1 | 2 | 3;
    const title = match[2].replace(/√\s*$/, "").trim();
    const completed =
      COMPLETED_RE.test(line) || CHECKBOX_CHECKED_RE.test(match[2]);

    const node: TaskNode = {
      id: `task-${i}`,
      level,
      title,
      rawLine: line,
      lineNumber: i + 1,
      completed,
      children: [],
    };

    // Find parent: walk stack backwards to find a node with smaller level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ level, node });
  }

  return root;
}
