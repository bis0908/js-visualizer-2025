import type { CodeExample, ExecutionState } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CallStackPanel } from "@/components/CallStackPanel";
import { CodeEditor } from "@/components/CodeEditor";
import { ConsolePanel } from "@/components/ConsolePanel";
import { ExampleModal } from "@/components/ExampleModal";
import { QueuePanel } from "@/components/QueuePanel";
import { TopBar } from "@/components/TopBar";
import { DynamicExecutionEngine } from "@/lib/dynamic";
import { LAYOUT_CONFIG } from "@/lib/layoutConfig";
import type { ParseError } from "@/lib/dynamic/types";

export default function Visualizer() {
  const [selectedExample, setSelectedExample] = useState<CodeExample | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [executionState, setExecutionState] = useState<ExecutionState>({
    callStack: [],
    taskQueue: [],
    microtaskQueue: [],
    consoleOutput: [],
    currentLine: null,
    isRunning: false,
    isPaused: false,
    speed: 500,
  });

  /** 파싱 에러 상태 */
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);

  /** 동적 실행 엔진 (메모이제이션) */
  const engineRef = useRef<DynamicExecutionEngine | null>(null);

  /** 코드 변경 디바운스 타이머 */
  const codeChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch examples
  const { data: examples = [], isLoading } = useQuery<CodeExample[]>({
    queryKey: ["examples"],
    queryFn: async () => {
      const res = await fetch("/api/examples");
      if (!res.ok) throw new Error("Failed to fetch examples");
      return res.json();
    },
    staleTime: Infinity,
    retry: false,
  });

  // Select first example by default
  useEffect(() => {
    if (examples.length > 0 && !selectedExample) {
      handleSelectExample(examples[0]);
    }
  }, [examples, selectedExample]);

  /**
   * 코드 로드 및 실행 엔진 초기화
   */
  const loadCode = useCallback((codeToLoad: string) => {
    // 동적 실행 엔진 생성 및 코드 로드
    const engine = new DynamicExecutionEngine();
    const result = engine.loadCode(codeToLoad);

    if (result.success) {
      engineRef.current = engine;
      setParseErrors([]);
      setExecutionState((prev) => ({
        ...engine.getInitialState(),
        speed: prev.speed,
      }));
    } else {
      // 파싱 에러 발생
      setParseErrors(result.errors ?? []);
      engineRef.current = null;
      setExecutionState((prev) => ({
        callStack: [],
        taskQueue: [],
        microtaskQueue: [],
        consoleOutput: [],
        currentLine: null,
        isRunning: false,
        isPaused: false,
        speed: prev.speed,
      }));
    }
  }, []);

  const handleSelectExample = useCallback((example: CodeExample) => {
    setSelectedExample(example);
    setCode(example.code);
    loadCode(example.code);
  }, [loadCode]);

  /**
   * 코드 변경 핸들러 (디바운스 적용)
   */
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);

    // 기존 타이머 취소
    if (codeChangeTimerRef.current) {
      clearTimeout(codeChangeTimerRef.current);
    }

    // 500ms 디바운스 후 코드 로드
    codeChangeTimerRef.current = setTimeout(() => {
      loadCode(newCode);
    }, 500);
  }, [loadCode]);

  const handlePlay = useCallback(() => {
    if (!engineRef.current) return;

    // 실행 완료 상태면 자동 리셋 후 재실행
    if (!engineRef.current.hasMoreSteps()) {
      engineRef.current.reset();
    }

    setExecutionState((prev) => ({
      ...prev,
      isRunning: true,
      isPaused: false,
    }));

    engineRef.current.play(executionState.speed, (newState) => {
      setExecutionState((prev) => ({ ...newState, speed: prev.speed }));
    });
  }, [executionState.speed]);

  const handlePause = useCallback(() => {
    if (!engineRef.current) return;

    engineRef.current.stop();
    setExecutionState((prev) => ({
      ...prev,
      isPaused: true,
      isRunning: false,
    }));
  }, []);

  const handleStep = useCallback(() => {
    if (!engineRef.current) return;

    const newState = engineRef.current.step();
    if (newState) {
      setExecutionState((prev) => ({ ...newState, speed: prev.speed }));
    }
  }, []);

  const handleReset = useCallback(() => {
    if (!engineRef.current) return;

    engineRef.current.reset();
    setExecutionState((prev) => ({
      ...engineRef.current!.getInitialState(),
      speed: prev.speed,
    }));
  }, []);

  const handleSpeedChange = useCallback(
    (speed: number) => {
      setExecutionState((prev) => ({
        ...prev,
        speed,
      }));

      // If currently playing, restart with new speed
      if (
        executionState.isRunning &&
        !executionState.isPaused &&
        engineRef.current
      ) {
        engineRef.current.play(speed, (newState) => {
          setExecutionState((_) => ({ ...newState, speed }));
        });
      }
    },
    [executionState.isRunning, executionState.isPaused],
  );

  const handleClearConsole = useCallback(() => {
    setExecutionState((prev) => ({
      ...prev,
      consoleOutput: [],
    }));
  }, []);

  // Stop playback when component unmounts
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
      if (codeChangeTimerRef.current) {
        clearTimeout(codeChangeTimerRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLInputElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          if (executionState.isRunning && !executionState.isPaused) {
            handlePause();
          } else {
            handlePlay();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          handleStep();
          break;
        case "r":
        case "R":
          e.preventDefault();
          handleReset();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    executionState.isRunning,
    executionState.isPaused,
    handlePlay,
    handlePause,
    handleStep,
    handleReset,
  ]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">
            Loading examples...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Preparing your learning environment
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar
        isRunning={executionState.isRunning}
        isPaused={executionState.isPaused}
        speed={executionState.speed}
        onPlay={handlePlay}
        onPause={handlePause}
        onStep={handleStep}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        exampleDrawer={
          <ExampleModal
            examples={examples}
            selectedId={selectedExample?.id || null}
            onSelect={handleSelectExample}
          />
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 좌측: 코드 에디터 영역 */}
        <div
          className="flex flex-col border-r"
          style={{
            width: LAYOUT_CONFIG.leftPanel.width,
            minWidth: LAYOUT_CONFIG.leftPanel.minWidth,
          }}
        >
          <div className="flex-1 p-4 overflow-hidden">
            <CodeEditor
              code={code}
              currentLine={executionState.currentLine}
              onChange={handleCodeChange}
              readOnly={executionState.isRunning}
              parseErrors={parseErrors}
            />
          </div>
        </div>

        {/* 우측: 시각화 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Task Queue - 수평 배치 */}
          <div
            className="border-b p-3"
            style={{ height: LAYOUT_CONFIG.rightPanel.queueHeight }}
          >
            <QueuePanel
              title="Task Queue"
              type="task"
              items={executionState.taskQueue}
            />
          </div>

          {/* Microtask Queue - 수평 배치 */}
          <div
            className="border-b p-3"
            style={{ height: LAYOUT_CONFIG.rightPanel.queueHeight }}
          >
            <QueuePanel
              title="Microtask Queue"
              type="microtask"
              items={executionState.microtaskQueue}
            />
          </div>

          {/* 하단: Call Stack + Console */}
          <div className="flex-1 flex overflow-hidden">
            {/* Call Stack */}
            <div className="w-1/2 p-3 border-r overflow-hidden">
              <CallStackPanel frames={executionState.callStack} />
            </div>

            {/* Console Output */}
            <div className="w-1/2 overflow-hidden">
              <ConsolePanel
                logs={executionState.consoleOutput}
                onClear={handleClearConsole}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
