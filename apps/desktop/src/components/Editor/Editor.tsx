import { useEffect, useRef } from "react";
import { Annotation, Compartment, EditorSelection, EditorState } from "@codemirror/state";
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
  /** store 里的 externalRevision，只有它变化时才把内容灌回编辑器 */
  externalRevision?: number;
  onChange?: (content: string) => void;
}

/** 标记"内容来自外部（同步拉取/冲突解决）"，这类事务不回调 onChange */
const externalChange = Annotation.define<boolean>();

export function Editor({
  initialContent = "",
  externalRevision = 0,
  onChange,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const theme = useThemeStore((s) => s.theme);
  const stickerMode = useStickerStore((s) => s.stickerMode);

  // 保持最新的 onChange，避免 view 只创建一次时闭包捕获旧回调
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 始终指向最新的 content，供外部写回时读取（不放进 effect 依赖，
  // 否则打字过程中的每次 content 变化都会触发写回）
  const contentRef = useRef(initialContent);
  contentRef.current = initialContent;

  const themeComp = useRef(new Compartment()).current;
  const gutterComp = useRef(new Compartment()).current;

  // 只创建一次；主题/贴纸模式通过 Compartment 热替换，不再重建整个视图，
  // 这样切主题不会丢掉撤销历史和光标位置
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (update.transactions.some((tr) => tr.annotation(externalChange))) return;
      onChangeRef.current?.(update.state.doc.toString());
    });

    const state = EditorState.create({
      doc: initialContent,
      selection: EditorSelection.cursor(initialContent.length),
      extensions: [
        gutterComp.of(stickerMode ? [] : lineNumbers()),
        history(),
        search(),
        markdown({ base: markdownLanguage }),
        markdownRenderPlugin,
        themeComp.of(theme === "light" ? lightTheme : darkTheme),
        keymap.of([
          ...planMeKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
        ]),
        EditorView.lineWrapping,
        // 移动端输入法：关掉自动大写/纠错，中文笔记里这些只会碍事
        EditorView.contentAttributes.of({
          autocapitalize: "off",
          autocorrect: "off",
          spellcheck: "false",
        }),
        updateListener,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeComp.reconfigure(theme === "light" ? lightTheme : darkTheme),
    });
  }, [theme, themeComp]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: gutterComp.reconfigure(stickerMode ? [] : lineNumbers()),
    });
  }, [stickerMode, gutterComp]);

  // 外部内容变更（同步拉取、冲突解决）写回编辑器。
  // 没有这一段的话，远端改动只进了 store、编辑器仍显示旧文本，
  // 紧接着的自动保存会把旧文本写回文件，远端改动就丢了。
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const next = contentRef.current;
    const current = view.state.doc.toString();
    if (next === current) return;

    const anchor = Math.min(view.state.selection.main.anchor, next.length);
    view.dispatch({
      changes: { from: 0, to: current.length, insert: next },
      selection: { anchor },
      annotations: externalChange.of(true),
    });
  }, [externalRevision]);

  return <div ref={containerRef} className="editor-container" />;
}
