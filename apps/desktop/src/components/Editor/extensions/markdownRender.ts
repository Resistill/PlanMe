import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { type EditorState, RangeSet } from "@codemirror/state";

class CheckmarkWidget extends WidgetType {
  constructor(private checked: boolean) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    if (this.checked) {
      span.className = "cm-planme-checkmark";
      span.textContent = "\u2713 ";
    } else {
      span.className = "cm-planme-checkbox-empty";
      span.textContent = "\u25CB ";
    }
    return span;
  }

  eq(other: CheckmarkWidget): boolean {
    return this.checked === other.checked;
  }
}

// Regex patterns
const HEADING_RE = /^(#{1,3})\s+/;
const COMPLETED_SUFFIX_RE = /\s*√\s*$/;
const CHECKBOX_RE = /^(\s*-\s*\[)([ xX])(\]\s+)/;
const BOLD_RE = /\*\*(.+?)\*\*/g;
const STRIKE_RE = /~~(.+?)~~/g;
const INLINE_CODE_RE = /`([^`]+)`/g;

interface RawDeco {
  from: number;
  to: number;
  deco: Decoration;
}

function collectLineDecorations(lineFrom: number, text: string): RawDeco[] {
  const decos: RawDeco[] = [];

  // --- Headings ---
  const headingMatch = text.match(HEADING_RE);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const hashEnd = lineFrom + headingMatch[0].length;
    const lineEnd = lineFrom + text.length;

    // Hide "# " prefix
    decos.push({
      from: lineFrom,
      to: hashEnd,
      deco: Decoration.replace({}),
    });

    // Check for √ at end
    const sqrtMatch = text.match(COMPLETED_SUFFIX_RE);
    const contentEnd = sqrtMatch ? lineEnd - sqrtMatch[0].length : lineEnd;

    // Style the heading text
    const cls =
      level === 1
        ? "cm-planme-h1"
        : level === 2
          ? "cm-planme-h2"
          : "cm-planme-h3";

    if (hashEnd < contentEnd) {
      decos.push({
        from: hashEnd,
        to: contentEnd,
        deco: Decoration.mark({ class: cls }),
      });
    }

    // Style the √
    if (sqrtMatch && contentEnd < lineEnd) {
      decos.push({
        from: contentEnd,
        to: lineEnd,
        deco: Decoration.mark({ class: `${cls} cm-planme-checkmark` }),
      });
    }

    return decos;
  }

  // --- Checkboxes ---
  const checkboxMatch = text.match(CHECKBOX_RE);
  if (checkboxMatch) {
    const isChecked = checkboxMatch[2].toLowerCase() === "x";
    const prefixLen =
      checkboxMatch[1].length +
      checkboxMatch[2].length +
      checkboxMatch[3].length;
    const lineEnd = lineFrom + text.length;

    // Replace "- [x] " with a widget
    decos.push({
      from: lineFrom,
      to: lineFrom + prefixLen,
      deco: Decoration.replace({
        widget: new CheckmarkWidget(isChecked),
      }),
    });

    // Strikethrough for completed items
    if (isChecked && lineFrom + prefixLen < lineEnd) {
      decos.push({
        from: lineFrom + prefixLen,
        to: lineEnd,
        deco: Decoration.mark({ class: "cm-planme-completed" }),
      });
    }

    return decos;
  }

  // --- Regular lines: inline formatting ---
  const lineEnd = lineFrom + text.length;

  // √ at end of line
  const sqrtMatch = text.match(COMPLETED_SUFFIX_RE);
  if (sqrtMatch) {
    const sqrtStart = lineEnd - sqrtMatch[0].length;
    decos.push({
      from: sqrtStart,
      to: lineEnd,
      deco: Decoration.mark({ class: "cm-planme-checkmark" }),
    });
  }

  // Bold: **text**
  for (const match of text.matchAll(BOLD_RE)) {
    const start = lineFrom + match.index!;
    const end = start + match[0].length;
    // Replace opening **
    decos.push({ from: start, to: start + 2, deco: Decoration.replace({}) });
    // Bold content
    decos.push({
      from: start + 2,
      to: end - 2,
      deco: Decoration.mark({ class: "cm-planme-bold" }),
    });
    // Replace closing **
    decos.push({ from: end - 2, to: end, deco: Decoration.replace({}) });
  }

  // Strikethrough: ~~text~~
  for (const match of text.matchAll(STRIKE_RE)) {
    const start = lineFrom + match.index!;
    const end = start + match[0].length;
    decos.push({ from: start, to: start + 2, deco: Decoration.replace({}) });
    decos.push({
      from: start + 2,
      to: end - 2,
      deco: Decoration.mark({ class: "cm-planme-strikethrough" }),
    });
    decos.push({ from: end - 2, to: end, deco: Decoration.replace({}) });
  }

  // Inline code: `text`
  for (const match of text.matchAll(INLINE_CODE_RE)) {
    const start = lineFrom + match.index!;
    const end = start + match[0].length;
    // Hide backticks, style content
    decos.push({ from: start, to: start + 1, deco: Decoration.replace({}) });
    decos.push({
      from: start + 1,
      to: end - 1,
      deco: Decoration.mark({ class: "cm-planme-inline-code" }),
    });
    decos.push({ from: end - 1, to: end, deco: Decoration.replace({}) });
  }

  return decos;
}

function buildDecorations(view: EditorView): DecorationSet {
  const allDecos: RawDeco[] = [];
  const cursor = view.state.selection.main.head;
  const cursorLine = view.state.doc.lineAt(cursor).number;

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);

      if (line.number !== cursorLine && line.text.length > 0) {
        const lineDecos = collectLineDecorations(line.from, line.text);
        allDecos.push(...lineDecos);
      }

      pos = line.to + 1;
    }
  }

  // Sort by from, then by to (ascending) — required by RangeSet.of
  allDecos.sort((a, b) => a.from - b.from || a.to - b.to);

  try {
    return RangeSet.of(allDecos.map((d) => d.deco.range(d.from, d.to)));
  } catch {
    // Fallback: return empty decorations if something goes wrong
    return RangeSet.empty;
  }
}

export const markdownRenderPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged
      ) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);
