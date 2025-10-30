import { Play, Pause, SkipForward, RotateCcw, Menu, Code2 } from "lucide-react";
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
        <div className="flex items-center gap-2" role="group" aria-label="Execution controls">
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
          <span className="text-sm font-medium text-muted-foreground">Speed</span>
          <div className="w-32">
            <Slider
              value={[speed]}
              onValueChange={(values) => onSpeedChange(values[0])}
              min={100}
              max={2000}
              step={100}
              data-testid="slider-speed"
              aria-label="Execution speed"
            />
          </div>
          <span className="text-xs text-muted-foreground w-12 text-right">
            {speed}ms
          </span>
        </div>
      </div>
    </header>
  );
}
