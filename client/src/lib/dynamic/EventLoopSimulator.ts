/**
 * 이벤트 루프 시뮬레이터
 * Call Stack, Task Queue, Microtask Queue 관리
 */

import type { ConsoleLog, QueueItem, StackFrame } from "@shared/schema";
import { nanoid } from "nanoid";
import type { Closure, ExecutionStep, ScheduledTask } from "./types";

export class EventLoopSimulator {
  /** 콜 스택 */
  private callStack: StackFrame[] = [];

  /** 태스크 큐 (매크로태스크) */
  private taskQueue: ScheduledTask[] = [];

  /** 마이크로태스크 큐 */
  private microtaskQueue: ScheduledTask[] = [];

  /** 콘솔 출력 */
  private consoleOutput: ConsoleLog[] = [];

  /** 논리적 시간 (ms) */
  private currentTime = 0;

  /** 현재 실행 중인 라인 */
  private currentLine: number | null = null;

  /** 현재 단계 설명 */
  private currentDescription = "";

  /**
   * 콜 스택에 프레임 푸시
   */
  pushToCallStack(frame: Omit<StackFrame, "id">): StackFrame {
    const stackFrame: StackFrame = {
      id: nanoid(8),
      ...frame,
    };
    this.callStack.push(stackFrame);
    return stackFrame;
  }

  /**
   * 콜 스택에서 프레임 팝
   */
  popFromCallStack(): StackFrame | undefined {
    return this.callStack.pop();
  }

  /**
   * 콜 스택 최상단 프레임 조회
   */
  peekCallStack(): StackFrame | undefined {
    return this.callStack[this.callStack.length - 1];
  }

  /**
   * 콜 스택이 비어있는지 확인
   */
  isCallStackEmpty(): boolean {
    return this.callStack.length === 0;
  }

  /**
   * 콜 스택 깊이 반환
   */
  getCallStackDepth(): number {
    return this.callStack.length;
  }

  /**
   * 태스크 스케줄링 (setTimeout 등)
   */
  scheduleTask(task: Omit<ScheduledTask, "id" | "type">): void {
    const scheduledTask: ScheduledTask = {
      id: nanoid(8),
      type: "task",
      ...task,
    };
    this.taskQueue.push(scheduledTask);

    // 딜레이 기준으로 정렬 (시간순)
    this.taskQueue.sort((a, b) => {
      const aTime = a.createdAt + (a.delay || 0);
      const bTime = b.createdAt + (b.delay || 0);
      return aTime - bTime;
    });
  }

  /**
   * 마이크로태스크 스케줄링 (Promise.then 등)
   */
  scheduleMicrotask(task: Omit<ScheduledTask, "id" | "type">): void {
    const scheduledTask: ScheduledTask = {
      id: nanoid(8),
      type: "microtask",
      ...task,
    };
    this.microtaskQueue.push(scheduledTask);
  }

  /**
   * 다음 마이크로태스크 꺼내기
   */
  popMicrotask(): ScheduledTask | undefined {
    return this.microtaskQueue.shift();
  }

  /**
   * 다음 태스크 꺼내기
   */
  popTask(): ScheduledTask | undefined {
    return this.taskQueue.shift();
  }

  /**
   * 마이크로태스크 큐가 비어있는지 확인
   */
  isMicrotaskQueueEmpty(): boolean {
    return this.microtaskQueue.length === 0;
  }

  /**
   * 태스크 큐가 비어있는지 확인
   */
  isTaskQueueEmpty(): boolean {
    return this.taskQueue.length === 0;
  }

  /**
   * [DEBUG] 마이크로태스크 큐 개수
   */
  getMicrotaskCount(): number {
    return this.microtaskQueue.length;
  }

  /**
   * [DEBUG] 태스크 큐 개수
   */
  getTaskCount(): number {
    return this.taskQueue.length;
  }

  /**
   * 대기 중인 태스크가 있는지 확인
   */
  hasPendingTasks(): boolean {
    return !this.isTaskQueueEmpty() || !this.isMicrotaskQueueEmpty();
  }

  /**
   * 콘솔 로그 추가
   */
  addConsoleLog(log: Omit<ConsoleLog, "id">): void {
    this.consoleOutput.push({
      id: nanoid(8),
      ...log,
    });
  }

  /**
   * 현재 시간 반환
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * 시간 진행
   */
  advanceTime(ms: number): void {
    this.currentTime += ms;
  }

  /**
   * 현재 라인 설정
   */
  setCurrentLine(line: number | null): void {
    this.currentLine = line;
  }

  /**
   * 현재 설명 설정
   */
  setDescription(description: string): void {
    this.currentDescription = description;
  }

  /**
   * 현재 상태 스냅샷 생성
   */
  getSnapshot(): ExecutionStep {
    return {
      callStack: [...this.callStack],
      taskQueue: this.taskQueue.map(this.taskToQueueItem),
      microtaskQueue: this.microtaskQueue.map(this.taskToQueueItem),
      consoleOutput: [...this.consoleOutput],
      currentLine: this.currentLine,
      description: this.currentDescription,
    };
  }

  /**
   * ScheduledTask를 QueueItem으로 변환 (UI 표시용)
   */
  private taskToQueueItem = (task: ScheduledTask): QueueItem => {
    return {
      id: task.id,
      type: task.type,
      source: task.source,
      callback: task.preview,
      timestamp: task.delay || 0,
      createdAt: task.createdAt,
    };
  };

  /**
   * 시뮬레이터 리셋
   */
  reset(): void {
    this.callStack = [];
    this.taskQueue = [];
    this.microtaskQueue = [];
    this.consoleOutput = [];
    this.currentTime = 0;
    this.currentLine = null;
    this.currentDescription = "";
  }

  /**
   * 디버깅용 상태 출력
   */
  debugState(): void {
    console.log("=== Event Loop State ===");
    console.log(
      "Call Stack:",
      this.callStack.map((f) => f.functionName),
    );
    console.log(
      "Task Queue:",
      this.taskQueue.map((t) => t.source),
    );
    console.log(
      "Microtask Queue:",
      this.microtaskQueue.map((t) => t.source),
    );
    console.log("Time:", this.currentTime);
  }
}
