import { javascript } from "@codemirror/lang-javascript";
import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { materialDark } from "@uiw/codemirror-theme-material";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { AlignLeft, AlertCircle } from "lucide-react";
import { format } from "prettier/standalone";
import parserBabel from "prettier/plugins/babel";
import parserEstree from "prettier/plugins/estree";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ParseError } from "@/lib/dynamic/types";

interface CodeEditorProps {
  code: string;
  currentLine: number | null;
  onChange?: (code: string) => void;
  readOnly?: boolean;
  parseErrors?: ParseError[];
}

// 현재 실행 줄 설정 Effect
const setExecutingLine = StateEffect.define<number | null>();

// 실행 줄 데코레이션
const executingLineDecoration = Decoration.line({
  class: "cm-executing-line",
});

// StateField로 현재 실행 줄 관리
const executingLineField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const e of tr.effects) {
      if (e.is(setExecutingLine)) {
        if (e.value === null || e.value < 1) return Decoration.none;
        try {
          const line = tr.state.doc.line(e.value);
          return Decoration.set([executingLineDecoration.range(line.from)]);
        } catch {
          return Decoration.none;
        }
      }
    }
    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// 커스텀 테마 설정 (Material Dark 기반 + 추가 스타일)
const customTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
  },
  ".cm-scroller": {
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    lineHeight: "1.6",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "1px solid rgba(255,255,255,0.1)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(130, 170, 255, 0.15)",
  },
  // 현재 실행 줄 스타일
  ".cm-executing-line": {
    background:
      "linear-gradient(90deg, rgba(130, 170, 255, 0.25) 0%, rgba(130, 170, 255, 0.08) 100%)",
    borderLeft: "3px solid #82aaff",
    marginLeft: "-3px",
    paddingLeft: "3px",
  },
});

export function CodeEditor({
  code,
  currentLine,
  onChange,
  readOnly = false,
  parseErrors = [],
}: CodeEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);

  // Extensions 메모이제이션
  const extensions = useMemo(
    () => [javascript(), executingLineField, customTheme],
    [],
  );

  // 코드 포매팅 핸들러
  const handleFormat = useCallback(async () => {
    if (!code.trim()) return;

    try {
      const formatted = await format(code, {
        parser: "babel",
        plugins: [parserBabel, parserEstree],
        semi: true,
        singleQuote: true,
        tabWidth: 2,
        trailingComma: "es5",
        printWidth: 80,
      });
      onChange?.(formatted);
    } catch (error) {
      // 포매팅 실패 시 원본 코드 유지
      console.error("포매팅 실패:", error);
    }
  }, [code, onChange]);

  // 현재 실행 줄 업데이트
  useEffect(() => {
    const view = editorRef.current?.view;
    if (view) {
      view.dispatch({
        effects: setExecutingLine.of(currentLine),
      });

      // 현재 줄로 스크롤
      if (currentLine !== null && currentLine >= 1) {
        try {
          const line = view.state.doc.line(currentLine);
          view.dispatch({
            effects: EditorView.scrollIntoView(line.from, { y: "center" }),
          });
        } catch {
          // 라인 번호가 범위를 벗어난 경우 무시
        }
      }
    }
  }, [currentLine]);

  return (
    <div className="h-full bg-[#263238] border border-[#37474f] rounded-lg overflow-hidden flex flex-col">
      {/* Editor header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-[#37474f] bg-[#1e272c]">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#80cbc4]">
          Code Editor
        </span>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFormat}
              className="h-7 px-2 text-xs text-[#80cbc4] hover:text-[#80cbc4] hover:bg-[#37474f]"
            >
              <AlignLeft className="w-3.5 h-3.5 mr-1" />
              Format
            </Button>
          )}
          {readOnly && (
            <span className="text-xs text-[#80cbc4]/70 bg-[#80cbc4]/10 px-2 py-0.5 rounded">
              Running
            </span>
          )}
        </div>
      </div>

      {/* 파싱 에러 표시 */}
      {parseErrors.length > 0 && (
        <div className="bg-red-900/30 border-b border-red-500/50 px-4 py-2">
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="font-medium">파싱 에러:</span>
          </div>
          {parseErrors.map((error, i) => (
            <div key={i} className="text-red-300 text-xs mt-1 ml-5">
              라인 {error.line}: {error.message}
            </div>
          ))}
        </div>
      )}

      {/* CodeMirror Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={code}
          onChange={(value) => onChange?.(value)}
          theme={materialDark}
          extensions={extensions}
          editable={!readOnly}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: false, // 커스텀 실행 줄 하이라이트 사용
            foldGutter: false,
            dropCursor: false,
            allowMultipleSelections: false,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            rectangularSelection: false,
            crosshairCursor: false,
            highlightSelectionMatches: false,
            searchKeymap: false,
          }}
          className={cn("h-full", readOnly && "cursor-default")}
          data-testid="code-editor"
          aria-label="Code editor"
        />
      </div>
    </div>
  );
}
