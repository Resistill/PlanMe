import { useEffect, useRef } from "react";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { search, searchKeymap } from "@codemirror/search";
import { markdownRenderPlugin } from "./extensions/markdownRender";
import { planMeKeymap } from "./extensions/keymap";
import { darkTheme, lightTheme } from "./extensions/theme";
import { useThemeStore } from "../../stores/themeStore";
import { useStickerStore } from "../../stores/stickerStore";
import "./editor.css";

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

export function Editor({ initialContent = "", onChange }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const stickerMode = useStickerStore((s) => s.stickerMode);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    });

    const editorTheme = theme === "light" ? lightTheme : darkTheme;

    const docLen = initialContent.length;
    const state = EditorState.create({
      doc: initialContent,
      selection: EditorSelection.cursor(docLen),
      extensions: [
        ...(stickerMode ? [] : [lineNumbers()]),
        history(),
        search(),
        markdown({ base: markdownLanguage }),
        markdownRenderPlugin,
        editorTheme,
        keymap.of([
          ...planMeKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
        ]),
        EditorView.lineWrapping,
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [theme, stickerMode]);

  return <div ref={containerRef} className="editor-container" />;
}
