import type { QueueItem } from "@shared/schema";
import { ArrowRight, Clock, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueuePanelProps {
  title: string;
  type: "task" | "microtask";
  items: QueueItem[];
  className?: string;
}

const typeColors = {
  task: {
    bg: "bg-blue-100 dark:bg-blue-300/30",
    text: "text-blue-800 dark:text-blue-400",
    icon: "text-blue-600 dark:text-blue-400",
    priority: "bg-blue-500",
  },
  microtask: {
    bg: "bg-purple-100 dark:bg-purple-300/30",
    text: "text-purple-800 dark:text-purple-400",
    icon: "text-purple-600 dark:text-purple-400",
    priority: "bg-purple-500",
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
      <div className="h-12 flex items-center justify-between px-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {type === "microtask" && (
            <Zap
              className="w-4 h-4 text-purple-500"
              aria-label="High priority"
            />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className={cn(
                "w-16 h-16 mb-3 rounded-full flex items-center justify-center",
                colors.bg,
              )}
            >
              <Clock className={cn("w-8 h-8", colors.icon)} />
            </div>
            <p className="text-sm text-muted-foreground">{title} is empty</p>
            <p className="text-xs text-muted-foreground mt-1">
              {type === "microtask"
                ? "Promise callbacks will appear here"
                : "setTimeout callbacks will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "border rounded p-3 flex items-start gap-3 relative transition-all duration-300",
                  "animate-in slide-in-from-right-8 fade-in duration-500",
                  index === 0
                    ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "hover-elevate active-elevate-2",
                )}
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
                data-testid={`queue-item-${item.id}`}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                    colors.bg,
                  )}
                >
                  <Clock className={cn("w-4 h-4", colors.icon)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wide",
                        colors.text,
                      )}
                    >
                      {item.source}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {item.timestamp}ms
                    </span>
                  </div>
                  <div className="text-xs font-mono text-foreground truncate mt-1 bg-muted/30 px-2 py-1 rounded">
                    {item.callback}
                  </div>
                  {index === 0 && (
                    <div className="text-xs text-primary mt-2 flex items-center gap-1 font-medium">
                      <ArrowRight className="w-3 h-3 animate-pulse" />
                      <span>Executing next</span>
                      <ArrowRight className="w-3 h-3 animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Priority indicator */}
                <div
                  className={cn(
                    "w-1 h-full rounded-full absolute right-0 top-0",
                    colors.priority,
                  )}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
