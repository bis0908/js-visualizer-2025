/**
 * 동적 실행 엔진 타입 정의
 */

import type {
  ConsoleLog,
  ExecutionState,
  QueueItem,
  StackFrame,
} from "@shared/schema";
import type { Node } from "acorn";

// ============================================
// 파싱 관련 타입
// ============================================

/** 파싱 에러 정보 */
export interface ParseError {
  line: number;
  column: number;
  message: string;
}

/** 코드 파싱 결과 */
export interface ParseResult {
  success: boolean;
  ast?: Node;
  errors: ParseError[];
  /** AST 노드 시작 위치 -> 소스 라인 번호 매핑 */
  sourceMap: Map<number, number>;
}

// ============================================
// 실행 컨텍스트 관련 타입
// ============================================

/** 스코프 타입 */
export type ScopeType = "global" | "function" | "block";

/** 변수 선언 종류 */
export type VariableKind = "var" | "let" | "const";

/** 스코프 정보 */
export interface Scope {
  id: string;
  type: ScopeType;
  parent: Scope | null;
  variables: Map<string, VariableBinding>;
  /** 함수 스코프의 this 바인딩 */
  thisBinding?: unknown;
}

/** 변수 바인딩 정보 */
export interface VariableBinding {
  name: string;
  kind: VariableKind;
  value: unknown;
  /** const로 선언된 경우 재할당 불가 */
  initialized: boolean;
}

/** 클로저 정보 */
export interface Closure {
  /** 함수 AST 노드 */
  functionNode: Node;
  /** 함수 정의 시점의 스코프 체인 */
  capturedScope: Scope;
  /** 함수 이름 (익명 함수의 경우 null) */
  name: string | null;
  /** async 함수 여부 */
  isAsync?: boolean;
}

// ============================================
// 이벤트 루프 관련 타입
// ============================================

/** 스케줄된 태스크 */
export interface ScheduledTask {
  id: string;
  type: "task" | "microtask";
  /** 콜백 함수 (클로저) */
  callback: Closure;
  /** 태스크 소스 (setTimeout, Promise.then 등) */
  source: string;
  /** setTimeout의 딜레이 (ms) */
  delay?: number;
  /** 생성 시점 (논리적 타임스탬프) */
  createdAt: number;
  /** 콜백 코드 미리보기 */
  preview: string;
  /** Promise 체이닝을 위한 연결된 Promise (콜백 실행 후 resolve) */
  chainedPromise?: SimulatedPromise;
  /** Promise 콜백에 전달할 resolved value */
  resolvedValue?: unknown;
  /** Promise.all/race 내부 처리용 콜백 (클로저 실행 대신 사용) */
  internalCallback?: () => void;
}

/** 실행 단계 정보 */
export interface ExecutionStep {
  callStack: StackFrame[];
  taskQueue: QueueItem[];
  microtaskQueue: QueueItem[];
  consoleOutput: ConsoleLog[];
  currentLine: number | null;
  /** 현재 단계 설명 */
  description: string;
}

// ============================================
// 인터프리터 관련 타입
// ============================================

/** 인터프리터 설정 */
export interface InterpreterConfig {
  /** 최대 실행 단계 수 (무한 루프 방지) */
  maxSteps: number;
  /** 최대 콜스택 깊이 */
  maxCallStackDepth: number;
  /** 최대 루프 반복 횟수 */
  maxLoopIterations: number;
}

/** 인터프리터 기본 설정 */
export const DEFAULT_INTERPRETER_CONFIG: InterpreterConfig = {
  maxSteps: 1000,
  maxCallStackDepth: 100,
  maxLoopIterations: 100,
};

/** 함수 호출 결과 */
export interface CallResult {
  /** 반환값 */
  value: unknown;
  /** 반환 여부 (return 문 실행됨) */
  returned: boolean;
}

/** Promise 시뮬레이션 상태 */
export type PromiseState = "pending" | "fulfilled" | "rejected";

/** Promise 콜백 핸들러 (체이닝 정보 포함) */
export interface PromiseHandler {
  callback: Closure;
  chainedPromise: SimulatedPromise;
  /** Promise.all/race 내부 처리용 콜백 */
  internalHandler?: (value: unknown) => void;
}

/** 시뮬레이션된 Promise */
export interface SimulatedPromise {
  id: string;
  state: PromiseState;
  value?: unknown;
  reason?: unknown;
  /** then 콜백 대기열 */
  onFulfilled: PromiseHandler[];
  /** catch 콜백 대기열 */
  onRejected: PromiseHandler[];
}

/** 시뮬레이션된 MessageChannel */
export interface SimulatedMessageChannel {
  id: string;
  port1: SimulatedMessagePort;
  port2: SimulatedMessagePort;
}

/** 시뮬레이션된 MessagePort */
export interface SimulatedMessagePort {
  id: string;
  channelId: string;
  onmessage: Closure | null;
  postMessage: (data: unknown) => void;
}

// ============================================
// 엔진 관련 타입
// ============================================

/** 동적 엔진 설정 */
export interface DynamicEngineConfig {
  maxSteps?: number;
  maxCallStackDepth?: number;
  maxLoopIterations?: number;
}

/** 코드 로드 결과 */
export interface LoadCodeResult {
  success: boolean;
  errors?: ParseError[];
}

// ============================================
// 에러 타입
// ============================================

/** 실행 제한 초과 에러 */
export class ExecutionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionLimitError";
  }
}

/** 런타임 에러 */
export class RuntimeError extends Error {
  constructor(
    message: string,
    public line?: number,
  ) {
    super(message);
    this.name = "RuntimeError";
  }
}

/** 사용자 코드에서 throw된 에러 (인터프리터 내부 전파용) */
export interface ThrownError {
  __isThrownError: true;
  error: unknown;
}

/** await에 의한 함수 일시 중지 (인터프리터 내부용) */
export interface AwaitSuspension {
  __isAwaitSuspension: true;
  /** await된 Promise */
  promise: SimulatedPromise;
  /** await 이후 실행할 노드들 */
  remainingStatements: Node[];
  /** 현재 스코프 정보 */
  scopeSnapshot: Scope;
}

// ============================================
// 유틸리티 타입
// ============================================

/** 내장 함수 핸들러 타입 */
export type BuiltinHandler = (
  args: unknown[],
  context: {
    scheduleTask: (task: Omit<ScheduledTask, "id">) => void;
    scheduleMicrotask: (task: Omit<ScheduledTask, "id">) => void;
    addConsoleLog: (log: Omit<ConsoleLog, "id">) => void;
    getCurrentTime: () => number;
  },
) => unknown;

/** 재귀적 타입 가드를 위한 유틸리티 */
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };
