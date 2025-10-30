import { z } from "zod";

export const codeExampleSchema = z.object({
  id: z.string(),
  title: z.string(),
  code: z.string(),
  description: z.string(),
  group: z.enum(["basic", "eventloop", "complex"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  expectedOutput: z.array(z.string()),
  learningTips: z.string(),
});

export type CodeExample = z.infer<typeof codeExampleSchema>;

export const stackFrameSchema = z.object({
  id: z.string(),
  functionName: z.string(),
  location: z.string(),
  variables: z.record(z.string(), z.unknown()).optional(),
});

export type StackFrame = z.infer<typeof stackFrameSchema>;

export const queueItemSchema = z.object({
  id: z.string(),
  type: z.enum(["task", "microtask"]),
  source: z.string(), // "setTimeout", "Promise.then", etc.
  callback: z.string(), // code preview
  timestamp: z.number(),
  createdAt: z.number(),
});

export type QueueItem = z.infer<typeof queueItemSchema>;

export const consoleLogSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  type: z.enum(["log", "error", "warn", "info"]),
  message: z.string(),
});

export type ConsoleLog = z.infer<typeof consoleLogSchema>;

export const executionStateSchema = z.object({
  callStack: z.array(stackFrameSchema),
  taskQueue: z.array(queueItemSchema),
  microtaskQueue: z.array(queueItemSchema),
  consoleOutput: z.array(consoleLogSchema),
  currentLine: z.number().nullable(),
  isRunning: z.boolean(),
  isPaused: z.boolean(),
  speed: z.number(), // milliseconds per step
});

export type ExecutionState = z.infer<typeof executionStateSchema>;
