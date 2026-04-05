import type { KeyBinding } from "@codemirror/view";
import { EditorView } from "@codemirror/view";

function toggleCompletion(view: EditorView): boolean {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const text = line.text;

  let newText: string;

  // Check if line has √ at end — remove it
  if (/√\s*$/.test(text)) {
    newText = text.replace(/\s*√\s*$/, "");
  }
  // Check if line has - [x] — change to - [ ]
  else if (/^\s*-\s*\[x\]/i.test(text)) {
    newText = text.replace(/\[x\]/i, "[ ]");
  }
  // Check if line has - [ ] — change to - [x]
  else if (/^\s*-\s*\[\s\]/.test(text)) {
    newText = text.replace(/\[\s\]/, "[x]");
  }
  // Otherwise, add √ at end
  else {
    newText = text + " √";
  }

  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
  });
  return true;
}

function promoteTask(view: EditorView): boolean {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const text = line.text;

  // ## -> #, ### -> ##
  const match = text.match(/^(#{2,3})\s/);
  if (!match) return false;

  const newText = text.replace(/^#{2,3}/, match[1].slice(0, -1));
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
  });
  return true;
}

function demoteTask(view: EditorView): boolean {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const text = line.text;

  // # -> ##, ## -> ###
  const match = text.match(/^(#{1,2})\s/);
  if (!match) return false;

  const newText = text.replace(/^#{1,2}/, match[1] + "#");
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText },
  });
  return true;
}

function newTaskBelow(view: EditorView): boolean {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);
  const text = line.text;

  // Determine heading level of current line, default to same or ## for subtask
  const match = text.match(/^(#{1,3})\s/);
  const prefix = match ? "#".repeat(Math.min(match[1].length + 1, 3)) + " " : "## ";

  const insert = "\n" + prefix;
  const pos = line.to;

  view.dispatch({
    changes: { from: pos, insert },
    selection: { anchor: pos + insert.length },
  });
  return true;
}

function moveLineUp(view: EditorView): boolean {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);

  if (line.number <= 1) return false;

  const prevLine = state.doc.line(line.number - 1);
  const cursorOffset = state.selection.main.head - line.from;

  view.dispatch({
    changes: {
      from: prevLine.from,
      to: line.to,
      insert: line.text + "\n" + prevLine.text,
    },
    selection: {
      anchor: prevLine.from + Math.min(cursorOffset, line.text.length),
    },
  });
  return true;
}

function moveLineDown(view: EditorView): boolean {
  const { state } = view;
  const line = state.doc.lineAt(state.selection.main.head);

  if (line.number >= state.doc.lines) return false;

  const nextLine = state.doc.line(line.number + 1);
  const cursorOffset = state.selection.main.head - line.from;

  view.dispatch({
    changes: {
      from: line.from,
      to: nextLine.to,
      insert: nextLine.text + "\n" + line.text,
    },
    selection: {
      anchor: line.from + nextLine.text.length + 1 + Math.min(cursorOffset, line.text.length),
    },
  });
  return true;
}

export const planMeKeymap: KeyBinding[] = [
  { key: "Ctrl-Enter", run: toggleCompletion },
  { key: "Ctrl-Shift-ArrowUp", run: promoteTask },
  { key: "Ctrl-Shift-ArrowDown", run: demoteTask },
  { key: "Ctrl-Shift-Enter", run: newTaskBelow },
  { key: "Alt-ArrowUp", run: moveLineUp },
  { key: "Alt-ArrowDown", run: moveLineDown },
];
