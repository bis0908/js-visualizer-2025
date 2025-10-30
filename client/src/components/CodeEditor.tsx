import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  code: string;
  currentLine: number | null;
  onChange?: (code: string) => void;
  readOnly?: boolean;
}

export function CodeEditor({ code, currentLine, onChange, readOnly = false }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = code.split("\n");

  useEffect(() => {
    // Auto-scroll to current line
    if (currentLine !== null && textareaRef.current) {
      const lineHeight = 20; // approximate
      const scrollTop = Math.max(0, currentLine * lineHeight - 100);
      textareaRef.current.parentElement?.scrollTo({ top: scrollTop, behavior: "smooth" });
    }
  }, [currentLine]);

  return (
    <div className="h-full bg-card border rounded-lg overflow-hidden flex flex-col">
      {/* Editor header */}
      <div className="h-10 flex items-center justify-between px-4 border-b bg-muted/30">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Code Editor
        </span>
        {readOnly && (
          <span className="text-xs text-muted-foreground">Read-only</span>
        )}
      </div>

      {/* Code area - 스크롤바 오버레이 방식으로 개선: 라인 번호와 인디케이터를 absolute로 배치하여 스크롤바가 코드 영역을 침범하지 않도록 함 */}
      <div className="flex-1 relative overflow-hidden">
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          className={cn(
            "w-full h-full p-4 pl-[60px] bg-transparent resize-none outline-none font-mono text-sm leading-5",
            "text-foreground overflow-auto",
            readOnly && "cursor-default"
          )}
          spellCheck={false}
          data-testid="textarea-code-editor"
          aria-label="Code editor"
        />

        {/* Line numbers - absolute positioning으로 오버레이 */}
        <div className="absolute left-0 top-0 w-12 h-full bg-muted/20 text-right pr-3 py-4 select-none border-r pointer-events-none">
          {lines.map((_, index) => (
            <div
              key={index}
              className={cn(
                "leading-5 text-muted-foreground transition-opacity",
                currentLine === index + 1 ? "opacity-100 font-semibold" : "opacity-50"
              )}
            >
              {index + 1}
            </div>
          ))}
        </div>

        {/* Current line indicator - absolute positioning으로 오버레이 */}
        <div className="absolute left-12 top-0 w-2 h-full pointer-events-none">
          {currentLine !== null && (
            <div
              className="absolute w-full h-5 bg-primary shadow-lg shadow-primary/50 transition-all duration-300 animate-pulse"
              style={{
                top: `${(currentLine - 1) * 20 + 16}px`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
