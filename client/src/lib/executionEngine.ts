import type { StackFrame, QueueItem, ConsoleLog, ExecutionState } from "@shared/schema";

export interface ExecutionStep {
  callStack: StackFrame[];
  taskQueue: QueueItem[];
  microtaskQueue: QueueItem[];
  consoleOutput: ConsoleLog[];
  currentLine: number | null;
  description: string;
}

// Pre-defined execution traces for each example
const executionTraces: Record<string, ExecutionStep[]> = {
  "1": [ // Call Stack Fundamentals
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 7", variables: {} }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 7,
      description: "Call b() from global scope"
    },
    {
      callStack: [
        { id: "s1", functionName: "global", location: "line 7" },
        { id: "s2", functionName: "b()", location: "line 4-6" }
      ],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 5,
      description: "Inside b(), call a()"
    },
    {
      callStack: [
        { id: "s1", functionName: "global", location: "line 7" },
        { id: "s2", functionName: "b()", location: "line 4-6" },
        { id: "s3", functionName: "a()", location: "line 1-3" }
      ],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 2,
      description: "Inside a(), execute console.log"
    },
    {
      callStack: [
        { id: "s1", functionName: "global", location: "line 7" },
        { id: "s2", functionName: "b()", location: "line 4-6" }
      ],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "a" }],
      currentLine: 6,
      description: "a() completes, pop from stack"
    },
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 7" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "a" },
        { id: "c2", timestamp: 1, type: "log", message: "b" }
      ],
      currentLine: 7,
      description: "b() completes, pop from stack"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "a" },
        { id: "c2", timestamp: 1, type: "log", message: "b" }
      ],
      currentLine: null,
      description: "Execution complete"
    },
  ],
  "2": [ // Scope & Closures
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 7", variables: {} }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 7,
      description: "Call outer() and store result"
    },
    {
      callStack: [
        { id: "s1", functionName: "global", location: "line 7" },
        { id: "s2", functionName: "outer()", location: "line 1-6", variables: { x: 1 } }
      ],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 3,
      description: "outer() creates closure with x=1"
    },
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 8", variables: { fn: "function" } }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 8,
      description: "First fn() call"
    },
    {
      callStack: [
        { id: "s1", functionName: "global", location: "line 8" },
        { id: "s3", functionName: "fn()", location: "line 3-5", variables: { x: 2 } }
      ],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 4,
      description: "Increment x to 2, log it"
    },
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 9" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "2" }],
      currentLine: 9,
      description: "Second fn() call"
    },
    {
      callStack: [
        { id: "s1", functionName: "global", location: "line 9" },
        { id: "s4", functionName: "fn()", location: "line 3-5", variables: { x: 3 } }
      ],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "2" }],
      currentLine: 4,
      description: "Increment x to 3, log it"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "2" },
        { id: "c2", timestamp: 1, type: "log", message: "3" }
      ],
      currentLine: null,
      description: "Execution complete - same x variable maintained!"
    },
  ],
  "3": [ // Task vs Microtask Basics
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 1" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "start" }],
      currentLine: 1,
      description: "Synchronous: console.log('start')"
    },
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 2" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('timeout')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "start" }],
      currentLine: 2,
      description: "setTimeout schedules task (goes to Task Queue)"
    },
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 3" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('timeout')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "Promise.then", callback: "console.log('promise')", timestamp: 2, createdAt: 2 }],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "start" }],
      currentLine: 3,
      description: "Promise.then schedules microtask"
    },
    {
      callStack: [],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('timeout')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "Promise.then", callback: "console.log('promise')", timestamp: 2, createdAt: 2 }],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "start" },
        { id: "c2", timestamp: 3, type: "log", message: "end" }
      ],
      currentLine: 4,
      description: "Synchronous: console.log('end'). Stack empty!"
    },
    {
      callStack: [{ id: "s2", functionName: "Promise callback", location: "Promise.then" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('timeout')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "start" },
        { id: "c2", timestamp: 3, type: "log", message: "end" }
      ],
      currentLine: 3,
      description: "Microtask queue drains FIRST! Execute promise callback"
    },
    {
      callStack: [],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('timeout')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "start" },
        { id: "c2", timestamp: 3, type: "log", message: "end" },
        { id: "c3", timestamp: 4, type: "log", message: "promise" }
      ],
      currentLine: null,
      description: "Microtasks complete. Now execute ONE task"
    },
    {
      callStack: [{ id: "s3", functionName: "setTimeout callback", location: "setTimeout" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "start" },
        { id: "c2", timestamp: 3, type: "log", message: "end" },
        { id: "c3", timestamp: 4, type: "log", message: "promise" }
      ],
      currentLine: 2,
      description: "Execute setTimeout callback"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "start" },
        { id: "c2", timestamp: 3, type: "log", message: "end" },
        { id: "c3", timestamp: 4, type: "log", message: "promise" },
        { id: "c4", timestamp: 5, type: "log", message: "timeout" }
      ],
      currentLine: null,
      description: "Execution complete! Order: start, end, promise, timeout"
    },
  ],
  "4": [ // Promise.then Chaining
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 2" }],
      taskQueue: [],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "Promise.then", callback: "console.log('then1')", timestamp: 0, createdAt: 0 }],
      consoleOutput: [],
      currentLine: 2,
      description: "First .then() scheduled as microtask"
    },
    {
      callStack: [{ id: "s2", functionName: "Promise.then", location: "line 2-4" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 1, type: "log", message: "then1" }],
      currentLine: 3,
      description: "Execute first .then(), log 'then1'"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [{ id: "m2", type: "microtask", source: "Promise.then", callback: "throw Error", timestamp: 2, createdAt: 2 }],
      consoleOutput: [{ id: "c1", timestamp: 1, type: "log", message: "then1" }],
      currentLine: 5,
      description: "Second .then() scheduled"
    },
    {
      callStack: [{ id: "s3", functionName: "Promise.then", location: "line 5-7" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 1, type: "log", message: "then1" }],
      currentLine: 6,
      description: "Execute second .then(), throws error"
    },
    {
      callStack: [{ id: "s4", functionName: "Promise.catch", location: "line 8" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 1, type: "log", message: "then1" }],
      currentLine: 8,
      description: "Error caught by .catch() handler"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 1, type: "log", message: "then1" },
        { id: "c2", timestamp: 4, type: "log", message: "caught err" }
      ],
      currentLine: null,
      description: "Execution complete. Error successfully caught!"
    },
  ],
  "5": [ // Promise.all vs Promise.race
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 1-3" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "resolve p1", timestamp: 50, createdAt: 0 }],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 3,
      description: "Create promises p1 (50ms delay) and p2 (resolved)"
    },
    {
      callStack: [],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "resolve p1", timestamp: 50, createdAt: 0 }],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "Promise.race.then", callback: "console.log", timestamp: 1, createdAt: 1 }],
      consoleOutput: [],
      currentLine: 4,
      description: "Promise.race resolves immediately with p2"
    },
    {
      callStack: [{ id: "s2", functionName: "Promise callback", location: "line 4" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "resolve p1", timestamp: 50, createdAt: 0 }],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 2, type: "log", message: "p2" }],
      currentLine: 4,
      description: "Log race result: p2 (the faster promise)"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [{ id: "m2", type: "microtask", source: "Promise.all.then", callback: "console.log", timestamp: 51, createdAt: 51 }],
      consoleOutput: [{ id: "c1", timestamp: 2, type: "log", message: "p2" }],
      currentLine: 3,
      description: "After 50ms, p1 resolves. Promise.all now ready"
    },
    {
      callStack: [{ id: "s3", functionName: "Promise callback", location: "line 3" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 2, type: "log", message: "p2" }],
      currentLine: 3,
      description: "Execute Promise.all callback"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 2, type: "log", message: "p2" },
        { id: "c2", timestamp: 52, type: "log", message: "['p1', 'p2']" }
      ],
      currentLine: null,
      description: "Execution complete. Race: p2 first, All: both values"
    },
  ],
  "6": [ // Nested Promise Chain
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 2" }],
      taskQueue: [],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "Promise.then", callback: "return Promise.resolve", timestamp: 0, createdAt: 0 }],
      consoleOutput: [],
      currentLine: 2,
      description: "First .then() scheduled"
    },
    {
      callStack: [{ id: "s2", functionName: "Promise.then", location: "line 2" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 2,
      description: "Execute first .then(), returns new Promise"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [{ id: "m2", type: "microtask", source: "Promise.then", callback: "console.log", timestamp: 2, createdAt: 2 }],
      consoleOutput: [],
      currentLine: 3,
      description: "Inner promise unwrapped, second .then() scheduled"
    },
    {
      callStack: [{ id: "s3", functionName: "Promise.then", location: "line 3" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [],
      currentLine: 3,
      description: "Execute second .then() with unwrapped value"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 3, type: "log", message: "after inner inner" }],
      currentLine: null,
      description: "Execution complete. Promise unwrapping demonstrated!"
    },
  ],
  "7": [ // Microtask Priority
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 1" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "S" }],
      currentLine: 1,
      description: "Synchronous: log 'S'"
    },
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 2" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('T')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "S" }],
      currentLine: 2,
      description: "Schedule setTimeout (Task Queue)"
    },
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 3-6" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('T')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "Promise.then", callback: "log M1, return Promise", timestamp: 2, createdAt: 2 }],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "S" }],
      currentLine: 3,
      description: "Schedule Promise.then (Microtask Queue)"
    },
    {
      callStack: [],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('T')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "Promise.then", callback: "log M1, return Promise", timestamp: 2, createdAt: 2 }],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "S" },
        { id: "c2", timestamp: 3, type: "log", message: "E" }
      ],
      currentLine: 7,
      description: "Synchronous: log 'E'. Stack empty!"
    },
    {
      callStack: [{ id: "s2", functionName: "Promise.then", location: "line 3-6" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('T')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "S" },
        { id: "c2", timestamp: 3, type: "log", message: "E" },
        { id: "c3", timestamp: 4, type: "log", message: "M1" }
      ],
      currentLine: 4,
      description: "Drain microtasks: log 'M1', return Promise"
    },
    {
      callStack: [],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('T')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [{ id: "m2", type: "microtask", source: "Promise.then", callback: "console.log('M2')", timestamp: 5, createdAt: 5 }],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "S" },
        { id: "c2", timestamp: 3, type: "log", message: "E" },
        { id: "c3", timestamp: 4, type: "log", message: "M1" }
      ],
      currentLine: 6,
      description: "New microtask scheduled, must drain it too!"
    },
    {
      callStack: [{ id: "s3", functionName: "Promise.then", location: "line 6" }],
      taskQueue: [{ id: "t1", type: "task", source: "setTimeout", callback: "console.log('T')", timestamp: 0, createdAt: 1 }],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "S" },
        { id: "c2", timestamp: 3, type: "log", message: "E" },
        { id: "c3", timestamp: 4, type: "log", message: "M1" },
        { id: "c4", timestamp: 6, type: "log", message: "M2" }
      ],
      currentLine: 6,
      description: "Continue draining: log 'M2'"
    },
    {
      callStack: [{ id: "s4", functionName: "setTimeout callback", location: "line 2" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "S" },
        { id: "c2", timestamp: 3, type: "log", message: "E" },
        { id: "c3", timestamp: 4, type: "log", message: "M1" },
        { id: "c4", timestamp: 6, type: "log", message: "M2" }
      ],
      currentLine: 2,
      description: "ALL microtasks done. Now execute task"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "S" },
        { id: "c2", timestamp: 3, type: "log", message: "E" },
        { id: "c3", timestamp: 4, type: "log", message: "M1" },
        { id: "c4", timestamp: 6, type: "log", message: "M2" },
        { id: "c5", timestamp: 7, type: "log", message: "T" }
      ],
      currentLine: null,
      description: "Complete! Microtasks ALWAYS drain before tasks"
    },
  ],
  "8": [ // async/await
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 1" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "start" }],
      currentLine: 1,
      description: "Synchronous: log 'start'"
    },
    {
      callStack: [
        { id: "s1", functionName: "global", location: "line 6" },
        { id: "s2", functionName: "f()", location: "line 2-5" }
      ],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "start" }],
      currentLine: 3,
      description: "Call async function f()"
    },
    {
      callStack: [{ id: "s1", functionName: "global", location: "line 6" }],
      taskQueue: [],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "await continuation", callback: "console.log('after await')", timestamp: 1, createdAt: 1 }],
      consoleOutput: [{ id: "c1", timestamp: 0, type: "log", message: "start" }],
      currentLine: 3,
      description: "await pauses f(), schedules continuation as microtask"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [{ id: "m1", type: "microtask", source: "await continuation", callback: "console.log('after await')", timestamp: 1, createdAt: 1 }],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "start" },
        { id: "c2", timestamp: 2, type: "log", message: "end" }
      ],
      currentLine: 7,
      description: "Synchronous code continues: log 'end'"
    },
    {
      callStack: [{ id: "s3", functionName: "f() continuation", location: "line 4" }],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "start" },
        { id: "c2", timestamp: 2, type: "log", message: "end" }
      ],
      currentLine: 4,
      description: "Microtask: resume f() after await"
    },
    {
      callStack: [],
      taskQueue: [],
      microtaskQueue: [],
      consoleOutput: [
        { id: "c1", timestamp: 0, type: "log", message: "start" },
        { id: "c2", timestamp: 2, type: "log", message: "end" },
        { id: "c3", timestamp: 3, type: "log", message: "after await" }
      ],
      currentLine: null,
      description: "Complete! await schedules continuation as microtask"
    },
  ],
};

export class ExecutionEngine {
  private steps: ExecutionStep[] = [];
  private currentStep = 0;
  private intervalId: number | null = null;

  constructor(exampleId: string) {
    this.steps = executionTraces[exampleId] || [];
    this.currentStep = 0;
  }

  getInitialState(): ExecutionState {
    if (this.steps.length === 0) {
      return {
        callStack: [],
        taskQueue: [],
        microtaskQueue: [],
        consoleOutput: [],
        currentLine: null,
        isRunning: false,
        isPaused: false,
        speed: 500,
      };
    }

    const firstStep = this.steps[0];
    return {
      callStack: firstStep.callStack,
      taskQueue: firstStep.taskQueue,
      microtaskQueue: firstStep.microtaskQueue,
      consoleOutput: firstStep.consoleOutput,
      currentLine: firstStep.currentLine,
      isRunning: false,
      isPaused: false,
      speed: 500,
    };
  }

  reset() {
    this.currentStep = 0;
    this.stop();
  }

  step(): ExecutionState | null {
    if (this.currentStep >= this.steps.length) {
      return null;
    }

    const currentStepData = this.steps[this.currentStep];
    this.currentStep++;

    return {
      callStack: currentStepData.callStack,
      taskQueue: currentStepData.taskQueue,
      microtaskQueue: currentStepData.microtaskQueue,
      consoleOutput: currentStepData.consoleOutput,
      currentLine: currentStepData.currentLine,
      isRunning: this.currentStep < this.steps.length,
      isPaused: false,
      speed: 500,
    };
  }

  play(speed: number, onStep: (state: ExecutionState) => void): void {
    this.stop(); // Clear any existing interval

    const executeStep = () => {
      const state = this.step();
      if (state) {
        onStep(state);
        if (this.currentStep >= this.steps.length) {
          this.stop();
          onStep({ ...state, isRunning: false });
        }
      } else {
        this.stop();
      }
    };

    this.intervalId = window.setInterval(executeStep, speed);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  hasMoreSteps(): boolean {
    return this.currentStep < this.steps.length;
  }

  getTotalSteps(): number {
    return this.steps.length;
  }

  getCurrentStepNumber(): number {
    return this.currentStep;
  }

  getCurrentDescription(): string {
    if (this.currentStep === 0) return "Ready to start";
    if (this.currentStep > this.steps.length) return "Execution complete";
    return this.steps[this.currentStep - 1]?.description || "";
  }
}
