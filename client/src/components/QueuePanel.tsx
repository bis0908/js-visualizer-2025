import type { QueueItem } from "@shared/schema";
import { ArrowRight, Clock, Zap } from "lucide-react";
import { LAYOUT_CONFIG } from "@/lib/layoutConfig";
import { cn } from "@/lib/utils";

interface QueuePanelProps {
  title: string;
  type: "task" | "microtask";
  items: QueueItem[];
  className?: string;
}

const typeColors = {
  task: {
    bg: "bg-blue-50 dark:bg-blue-950/60",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-800 dark:text-blue-200",
    icon: "text-blue-600 dark:text-blue-300",
    header: "bg-blue-100/80 dark:bg-blue-900/50",
    active:
      "bg-blue-100 dark:bg-blue-900/70 border-blue-400 dark:border-blue-500 shadow-blue-500/30",
  },
  microtask: {
    bg: "bg-purple-50 dark:bg-purple-950/60",
    border: "border-purple-300 dark:border-purple-700",
    text: "text-purple-800 dark:text-purple-200",
    icon: "text-purple-600 dark:text-purple-300",
    header: "bg-purple-100/80 dark:bg-purple-900/50",
    active:
      "bg-purple-100 dark:bg-purple-900/70 border-purple-400 dark:border-purple-500 shadow-purple-500/30",
  },
};

export function QueuePanel({ title, type, items, className }: QueuePanelProps) {
  const colors = typeColors[type];

  return (
    <div
      className={cn(
        "h-full bg-card border rounded-lg overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Panel header */}
      <div
        className={cn(
          "h-10 flex items-center justify-between px-4 border-b",
          colors.header,
        )}
      >
        <div className="flex items-center gap-2">
          {type === "microtask" ? (
            <Zap className={cn("w-4 h-4", colors.icon)} />
          ) : (
            <Clock className={cn("w-4 h-4", colors.icon)} />
          )}
          <h2 className={cn("text-sm font-semibold", colors.text)}>{title}</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Queue items - 수평 배치 */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full px-4">
            <p className="text-sm text-muted-foreground">
              {type === "microtask"
                ? "Promise callbacks appear here"
                : "setTimeout callbacks appear here"}
            </p>
          </div>
        ) : (
          <div
            className="flex items-center h-full px-3 gap-3"
            style={{ minWidth: "max-content" }}
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "shrink-0 border rounded-lg p-3 transition-all duration-300",
                  "animate-in slide-in-from-right-4 fade-in duration-300",
                  index === 0
                    ? cn("shadow-lg scale-105", colors.active)
                    : cn("bg-card hover:scale-102", colors.border),
                )}
                style={{
                  width: LAYOUT_CONFIG.queue.itemWidth,
                  minWidth: LAYOUT_CONFIG.queue.itemMinWidth,
                  animationDelay: `${index * 50}ms`,
                }}
                data-testid={`queue-item-${item.id}`}
              >
                {/* 소스 타입 */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wide",
                      colors.text,
                    )}
                  >
                    {item.source}
                  </span>
                  {index === 0 && (
                    <ArrowRight className="w-3 h-3 text-primary animate-pulse" />
                  )}
                </div>

                {/* 콜백 함수 */}
                <div className="text-xs font-mono text-foreground truncate bg-muted/50 px-2 py-1.5 rounded">
                  {item.callback}
                </div>

                {/* 첫 번째 아이템 표시 */}
                {index === 0 && (
                  <div className="text-[10px] text-primary mt-2 font-medium text-center">
                    Next
                  </div>
                )}
              </div>
            ))}

            {/* 방향 표시 화살표 (우측) */}
            <div className="shrink-0 flex items-center justify-center w-8 h-8 text-muted-foreground/50">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
