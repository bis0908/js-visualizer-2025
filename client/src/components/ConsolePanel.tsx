import { useState, useRef, useEffect } from "react";
import { Terminal, Info, AlertTriangle, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConsoleLog } from "@shared/schema";

interface ConsolePanelProps {
  logs: ConsoleLog[];
  onClear: () => void;
}

const logIcons = {
  log: Terminal,
  info: Info,
  warn: AlertTriangle,
  error: XCircle,
};

const logColors = {
  log: "text-foreground",
  info: "text-blue-600 dark:text-blue-400",
  warn: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
};

export function ConsolePanel({ logs, onClear }: ConsolePanelProps) {
  const [height, setHeight] = useState(192); // 48 * 4 = 192px (h-48)
  const [isResizing, setIsResizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = startYRef.current - e.clientY;
      const newHeight = Math.max(192, Math.min(384, startHeightRef.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, height]);

  return (
    <div
      className="bg-card border-t overflow-hidden flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Resize handle */}
      <div
        className={cn(
          "h-1 cursor-ns-resize hover:h-2 hover:bg-primary/20 transition-all",
          isResizing && "bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
        role="separator"
        aria-label="Resize console"
        aria-orientation="horizontal"
      />

      {/* Console header */}
      <div className="h-12 flex items-center justify-between px-4 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <h2 className="text-base font-semibold">Console Output</h2>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          data-testid="button-clear-console"
          className="text-xs"
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Clear
        </Button>
      </div>

      {/* Console logs */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-sm"
        role="log"
        aria-live="polite"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Terminal className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No console output yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run code to see console.log() output
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const Icon = logIcons[log.type];
            return (
              <div
                key={log.id}
                className="py-1 px-4 border-b hover:bg-muted/30 flex items-start gap-3"
                data-testid={`console-log-${log.id}`}
              >
                <span className="text-xs text-muted-foreground w-20 shrink-0 font-mono">
                  {log.timestamp}ms
                </span>
                <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", logColors[log.type])} />
                <span className={cn("flex-1 break-all", logColors[log.type])}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
