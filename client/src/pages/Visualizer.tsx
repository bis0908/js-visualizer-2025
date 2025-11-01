import type { CodeExample, ExecutionState } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CallStackPanel } from "@/components/CallStackPanel";
import { CodeEditor } from "@/components/CodeEditor";
import { ConsolePanel } from "@/components/ConsolePanel";
import { ExampleSidebar } from "@/components/ExampleSidebar";
import { QueuePanel } from "@/components/QueuePanel";
import { TopBar } from "@/components/TopBar";
import { ExecutionEngine } from "@/lib/executionEngine";
import { LAYOUT_CONFIG } from "@/lib/layoutConfig";

export default function Visualizer() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const engineRef = useRef<ExecutionEngine | null>(null);

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

  const handleSelectExample = useCallback((example: CodeExample) => {
    setSelectedExample(example);
    setCode(example.code);

    // Create new execution engine for this example
    const engine = new ExecutionEngine(example.id);
    engineRef.current = engine;

    // Reset to initial state
    setExecutionState(engine.getInitialState());
  }, []);

  const handlePlay = useCallback(() => {
    if (!engineRef.current) return;

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
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        <ExampleSidebar
          examples={examples}
          selectedId={selectedExample?.id || null}
          onSelect={handleSelectExample}
          isOpen={sidebarOpen}
        />

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 상단: 코드 에디터 + 콜스택 + 큐 영역 */}
          <div
            className="flex overflow-hidden"
            style={{ height: `${LAYOUT_CONFIG.rightPanel.visualizationArea}%` }}
          >
            {/* Code editor section - 왼쪽 영역 */}
            <div
              className="p-4 overflow-hidden"
              style={{ width: LAYOUT_CONFIG.mainArea.codeEditorWidth }}
            >
              <CodeEditor
                code={code}
                currentLine={executionState.currentLine}
                onChange={setCode}
                readOnly={executionState.isRunning}
              />
            </div>

            {/* Call Stack - 중앙에 세로로 배치 */}
            <div
              className="p-4 overflow-hidden border-l"
              style={{ width: LAYOUT_CONFIG.mainArea.callStackWidth }}
            >
              <CallStackPanel frames={executionState.callStack} />
            </div>

            {/* Queue panels - 우측 영역 */}
            <div className="flex-1 flex flex-col gap-0 border-l">
              <div className="flex-1 p-4 overflow-hidden">
                <QueuePanel
                  title="Microtask Queue"
                  type="microtask"
                  items={executionState.microtaskQueue}
                />
              </div>
              <div className="flex-1 p-4 overflow-hidden border-t">
                <QueuePanel
                  title="Task Queue"
                  type="task"
                  items={executionState.taskQueue}
                />
              </div>
            </div>
          </div>

          {/* 하단: Console Output - 전체 너비 */}
          <div
            className="border-t"
            style={{ height: `${LAYOUT_CONFIG.rightPanel.consoleArea}vh` }}
          >
            <ConsolePanel
              logs={executionState.consoleOutput}
              onClear={handleClearConsole}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
