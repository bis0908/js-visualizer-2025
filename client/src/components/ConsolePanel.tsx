import type { ConsoleLog } from "@shared/schema";
import { AlertTriangle, Info, Terminal, Trash2, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  log: "text-gray-800 dark:text-gray-200",
  info: "text-blue-700 dark:text-blue-300",
  warn: "text-amber-700 dark:text-amber-300 font-medium",
  error: "text-red-700 dark:text-red-300 font-medium",
};

export function ConsolePanel({ logs, onClear }: ConsolePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  // logs.length를 명시적으로 사용하여 logs 변경 시 스크롤 트리거
  const logsLength = logs.length;
  useEffect(() => {
    if (scrollRef.current && logsLength > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logsLength]);

  return (
    <div className="h-full bg-card overflow-hidden flex flex-col">
      {/* Console header */}
      <div className="h-10 flex items-center justify-between px-4 border-b bg-slate-100/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Console Output
          </h2>
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
            <p className="text-sm text-muted-foreground">
              No console output yet
            </p>
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
                <Icon
                  className={cn("w-4 h-4 mt-0.5 shrink-0", logColors[log.type])}
                />
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
