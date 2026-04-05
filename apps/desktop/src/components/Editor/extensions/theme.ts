import { EditorView } from "@codemirror/view";

export const darkTheme = EditorView.theme({
  "&": {
    backgroundColor: "#1e1e2e",
    color: "#cdd6f4",
  },
  ".cm-content": {
    caretColor: "#f5e0dc",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#f5e0dc",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "#45475a",
    },
  ".cm-gutters": {
    backgroundColor: "#181825",
    color: "#6c7086",
    border: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#313244",
    color: "#cdd6f4",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(49, 50, 68, 0.5)",
  },
  ".cm-searchMatch": {
    backgroundColor: "#f9e2af33",
    outline: "1px solid #f9e2af66",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#f9e2af55",
  },
});

export const lightTheme = EditorView.theme({
  "&": {
    backgroundColor: "#eff1f5",
    color: "#4c4f69",
  },
  ".cm-content": {
    caretColor: "#dc8a78",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "#dc8a78",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    {
      backgroundColor: "#acb0be",
    },
  ".cm-gutters": {
    backgroundColor: "#e6e9ef",
    color: "#9ca0b0",
    border: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#ccd0da",
    color: "#4c4f69",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(204, 208, 218, 0.5)",
  },
  ".cm-searchMatch": {
    backgroundColor: "#df8e1d33",
    outline: "1px solid #df8e1d66",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#df8e1d55",
  },
  // Light theme heading colors
  "& .cm-planme-h1": {
    color: "#8839ef",
  },
  "& .cm-planme-h2": {
    color: "#1e66f5",
  },
  "& .cm-planme-h3": {
    color: "#179299",
  },
  "& .cm-planme-checkmark": {
    color: "#40a02b",
  },
  "& .cm-planme-inline-code": {
    background: "rgba(108, 112, 134, 0.15)",
  },
});

// Default export for backwards compat
export const planMeTheme = darkTheme;
