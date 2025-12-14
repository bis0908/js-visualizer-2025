import { Code2, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TopBarProps {
  isRunning: boolean;
  isPaused: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  exampleDrawer: ReactNode;
}

// 속도 레이블 계산 함수
function getSpeedLabel(speed: number): string {
  if (speed <= 500) return "Fast";
  if (speed <= 1000) return "Normal";
  if (speed <= 1500) return "Moderate";
  return "Slow";
}

// 슬라이더 UI 값 ↔ 실제 speed 값 변환
// UI: 좌측(100) = Slow, 우측(2000) = Fast
// 실제: speed 100 = Fast, speed 2000 = Slow
// 변환 공식: uiValue + speed = 2100
const speedToSliderValue = (speed: number) => 2100 - speed;
const sliderValueToSpeed = (value: number) => 2100 - value;

export function TopBar({
  isRunning,
  isPaused,
  speed,
  onPlay,
  onPause,
  onStep,
  onReset,
  onSpeedChange,
  exampleDrawer,
}: TopBarProps) {
  const [showSpeedTooltip, setShowSpeedTooltip] = useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 bg-background border-b">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold">JS Visualizer</h1>
          </div>
          {/* Example Modal 버튼 */}
          {exampleDrawer}
        </div>

        <div className="flex items-center gap-6">
          {/* Control buttons with tooltips */}
          <div className="flex items-center gap-2">
            {/* Play/Pause button */}
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isRunning && !isPaused ? "Pause (Space)" : "Play (Space)"}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Step forward button */}
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Step Forward (→)</p>
              </TooltipContent>
            </Tooltip>

            {/* Reset button */}
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset (R)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Speed control - 방향 반전: Slow(좌) → Fast(우) */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Speed
            </span>

            {/* 슬라이더 컨테이너 with 툴팁 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-orange-500">Slow</span>

              <div className="relative w-32">
                <Slider
                  value={[speedToSliderValue(speed)]}
                  onValueChange={(values) => {
                    setShowSpeedTooltip(true);
                    onSpeedChange(sliderValueToSpeed(values[0]));
                  }}
                  onPointerEnter={() => setShowSpeedTooltip(true)}
                  onPointerLeave={() => setShowSpeedTooltip(false)}
                  onFocus={() => setShowSpeedTooltip(true)}
                  onBlur={() => setShowSpeedTooltip(false)}
                  min={100}
                  max={2000}
                  step={100}
                  data-testid="slider-speed"
                  aria-label="Execution speed"
                />

                {/* 속도 툴팁 */}
                {showSpeedTooltip && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                    {speed}ms ({getSpeedLabel(speed)})
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mt-px">
                      <div className="border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
                    </div>
                  </div>
                )}
              </div>

              <span className="text-xs font-medium text-emerald-500">Fast</span>
            </div>

            <span className="text-sm font-mono font-medium text-foreground w-14 text-right">
              {speed}ms
            </span>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
