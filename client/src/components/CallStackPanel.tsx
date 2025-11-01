import type { StackFrame } from "@shared/schema";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CallStackPanelProps {
  frames: StackFrame[];
}

export function CallStackPanel({ frames }: CallStackPanelProps) {
  const [expandedFrames, setExpandedFrames] = useState<Set<string>>(new Set());

  const toggleFrame = (frameId: string) => {
    const newExpanded = new Set(expandedFrames);
    if (newExpanded.has(frameId)) {
      newExpanded.delete(frameId);
    } else {
      newExpanded.add(frameId);
    }
    setExpandedFrames(newExpanded);
  };

  return (
    <div className="h-full bg-card border rounded-lg overflow-hidden flex flex-col">
      {/* Panel header */}
      <div className="h-12 flex items-center justify-between px-4 border-b">
        <h2 className="text-base font-semibold">Call Stack</h2>
        <span className="text-xs text-muted-foreground">
          {frames.length} frame{frames.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Stack frames - 밑에서부터 쌓이는 방식: flex-col-reverse 사용 */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse">
        {frames.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-3 rounded-full bg-muted flex items-center justify-center">
              <svg
                className="w-8 h-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <title>svg</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 7h16M4 12h16M4 17h16"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Call stack is empty</p>
            <p className="text-xs text-muted-foreground mt-1">
              Execute code to see function calls
            </p>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2">
            {frames.map((frame, index) => {
              const isExpanded = expandedFrames.has(frame.id);
              const hasVariables =
                frame.variables && Object.keys(frame.variables).length > 0;

              return (
                <div
                  key={frame.id}
                  className={cn(
                    "border rounded-lg p-3 transition-all duration-300 ease-out",
                    "animate-in slide-in-from-bottom-4 fade-in",
                    index === frames.length - 1
                      ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/20 scale-[1.02]"
                      : "bg-background hover-elevate",
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                  data-testid={`stack-frame-${frame.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-base font-semibold font-mono">
                        {frame.functionName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {frame.location}
                      </div>
                    </div>
                    {hasVariables && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleFrame(frame.id)}
                        aria-label={
                          isExpanded ? "Collapse variables" : "Expand variables"
                        }
                        data-testid={`button-toggle-frame-${frame.id}`}
                        className="shrink-0"
                      >
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </Button>
                    )}
                  </div>

                  {/* Variables */}
                  {hasVariables && (
                    <div
                      className={cn(
                        "transition-all duration-200 overflow-hidden",
                        isExpanded ? "max-h-96 mt-3" : "max-h-0",
                      )}
                    >
                      <div className="text-xs font-mono space-y-1 border-t pt-2">
                        {Object.entries(frame.variables!).map(
                          ([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-muted-foreground">
                                {key}:
                              </span>
                              <span className="text-foreground break-all">
                                {JSON.stringify(value)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
