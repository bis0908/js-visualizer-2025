import { Code2, Menu, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface TopBarProps {
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleSidebar: () => void;
}

// 속도 레이블 계산 함수
function getSpeedLabel(speed: number): string {
  if (speed <= 500) return "Fast";
  if (speed <= 1000) return "Normal";
  if (speed <= 1500) return "Moderate";
  return "Slow";
}

export function TopBar({
  isRunning,
  isPaused,
  speed,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
  onToggleSidebar,
}: TopBarProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <header className="sticky top-0 z-50 h-16 flex items-center justify-between px-6 bg-background border-b">
      <div className="flex items-center gap-4">
        <Button
          size="icon"
          variant="ghost"
          onClick={onToggleSidebar}
          data-testid="button-toggle-sidebar"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Code2 className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">JS Execution Visualizer</h1>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Control buttons */}
        <div
          className="flex items-center gap-2"
          // role="group"
          // aria-label="Execution controls"
        >
          <Button
            size="icon"
            variant={isRunning && !isPaused ? "secondary" : "default"}
            onClick={isRunning && !isPaused ? onPause : onPlay}
            data-testid="button-play-pause"
            aria-label={isRunning && !isPaused ? "Pause" : "Play"}
            className="active:scale-95 transition-transform duration-100"
          >
            {isRunning && !isPaused ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={onStep}
            data-testid="button-step"
            aria-label="Step forward"
            className="active:scale-95 transition-transform duration-100"
          >
            <SkipForward className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={onReset}
            data-testid="button-reset"
            aria-label="Reset execution"
            className="active:scale-95 transition-transform duration-100"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Speed
          </span>

          {/* 슬라이더 컨테이너 with 툴팁 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-blue-600">Fast</span>

            <div className="relative w-32">
              <Slider
                value={[speed]}
                onValueChange={(values) => {
                  setShowTooltip(true);
                  onSpeedChange(values[0]);
                }}
                onPointerEnter={() => setShowTooltip(true)}
                onPointerLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                min={100}
                max={2000}
                step={100}
                data-testid="slider-speed"
                aria-label="Execution speed"
              />

              {/* 툴팁 */}
              {showTooltip && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                  {speed}ms ({getSpeedLabel(speed)})
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
                  </div>
                </div>
              )}
            </div>

            <span className="text-xs font-medium text-orange-600 dark:text-orange-700">
              Slow
            </span>
          </div>

          <span className="text-sm font-mono font-medium text-foreground w-14 text-right">
            {speed}ms
          </span>
        </div>
      </div>
    </header>
  );
}
