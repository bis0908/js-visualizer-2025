/**
 * 내장 함수/객체 핸들러
 * console, setTimeout, Promise 등 JavaScript 내장 기능 시뮬레이션
 */

import { nanoid } from "nanoid";
import type { EventLoopSimulator } from "./EventLoopSimulator";
import type { Closure, SimulatedPromise } from "./types";

/** 내장 핸들러 컨텍스트 */
export interface BuiltinContext {
  eventLoop: EventLoopSimulator;
  /** 클로저 실행 함수 (인터프리터에서 주입) */
  executeClosure: (closure: Closure, args: unknown[]) => unknown;
}

export class BuiltinHandlers {
  private context: BuiltinContext;

  /** 생성된 Promise 맵 */
  private promises: Map<string, SimulatedPromise> = new Map();

  constructor(context: BuiltinContext) {
    this.context = context;
  }

  /**
   * 내장 함수 호출
   */
  call(name: string, args: unknown[]): unknown {
    switch (name) {
      // console 메서드
      case "console.log":
        return this.consoleLog(args, "log");
      case "console.error":
        return this.consoleLog(args, "error");
      case "console.warn":
        return this.consoleLog(args, "warn");
      case "console.info":
        return this.consoleLog(args, "info");

      // 타이머
      case "setTimeout":
        return this.setTimeout(args);
      case "clearTimeout":
        return this.clearTimeout(args);

      // Promise
      case "Promise.resolve":
        return this.promiseResolve(args);
      case "Promise.reject":
        return this.promiseReject(args);

      default:
        throw new Error(`알 수 없는 내장 함수: ${name}`);
    }
  }

  /**
   * 내장 함수인지 확인
   */
  isBuiltin(name: string): boolean {
    const builtins = [
      "console.log",
      "console.error",
      "console.warn",
      "console.info",
      "setTimeout",
      "clearTimeout",
      "Promise.resolve",
      "Promise.reject",
    ];
    return builtins.includes(name);
  }

  /**
   * console.log/error/warn/info 처리
   */
  private consoleLog(
    args: unknown[],
    type: "log" | "error" | "warn" | "info",
  ): void {
    const message = args.map((arg) => this.stringify(arg)).join(" ");

    this.context.eventLoop.addConsoleLog({
      timestamp: this.context.eventLoop.getCurrentTime(),
      type,
      message,
    });
  }

  /**
   * setTimeout 처리
   */
  private setTimeout(args: unknown[]): number {
    const [callback, delay = 0] = args;

    if (typeof callback !== "object" || !callback) {
      throw new Error("setTimeout의 첫 번째 인자는 함수여야 합니다");
    }

    const closure = callback as Closure;
    const timerId = Math.floor(Math.random() * 1000000);

    this.context.eventLoop.scheduleTask({
      callback: closure,
      source: "setTimeout",
      delay: Number(delay),
      createdAt: this.context.eventLoop.getCurrentTime(),
      preview: `setTimeout callback (${delay}ms)`,
    });

    return timerId;
  }

  /**
   * clearTimeout 처리 (구현 생략 - 시각화에서는 중요하지 않음)
   */
  private clearTimeout(_args: unknown[]): void {
    // 시각화 목적에서는 생략
  }

  /**
   * Promise.resolve 처리
   */
  promiseResolve(args: unknown[]): SimulatedPromise {
    const value = args[0];

    // 이미 Promise인 경우 그대로 반환
    if (this.isSimulatedPromise(value)) {
      return value;
    }

    const promise: SimulatedPromise = {
      id: nanoid(8),
      state: "fulfilled",
      value,
      onFulfilled: [],
      onRejected: [],
    };

    this.promises.set(promise.id, promise);
    return promise;
  }

  /**
   * Promise.reject 처리
   */
  private promiseReject(args: unknown[]): SimulatedPromise {
    const reason = args[0];

    const promise: SimulatedPromise = {
      id: nanoid(8),
      state: "rejected",
      reason,
      onFulfilled: [],
      onRejected: [],
    };

    this.promises.set(promise.id, promise);
    return promise;
  }

  /**
   * 새 Promise 생성 (new Promise(executor))
   */
  createPromise(executor: Closure): SimulatedPromise {
    const promise: SimulatedPromise = {
      id: nanoid(8),
      state: "pending",
      onFulfilled: [],
      onRejected: [],
    };

    this.promises.set(promise.id, promise);

    // resolve/reject 함수 생성
    const resolve = (value: unknown) => {
      this.resolvePromise(promise, value);
    };

    const reject = (reason: unknown) => {
      if (promise.state !== "pending") return;

      promise.state = "rejected";
      promise.reason = reason;

      // 등록된 catch 콜백들을 마이크로태스크로 스케줄
      for (const handler of promise.onRejected) {
        this.context.eventLoop.scheduleMicrotask({
          callback: handler.callback,
          source: "Promise.catch",
          createdAt: this.context.eventLoop.getCurrentTime(),
          preview: "Promise.catch callback",
          chainedPromise: handler.chainedPromise,
        });
      }
    };

    // executor 실행은 동기적으로 수행
    // 실제로는 인터프리터에서 처리해야 함
    // 여기서는 resolve/reject 함수만 반환
    promise.value = { resolve, reject, executor };

    return promise;
  }

  /**
   * Promise.prototype.then 처리
   */
  promiseThen(
    promise: SimulatedPromise,
    onFulfilled?: Closure,
    onRejected?: Closure,
  ): SimulatedPromise {
    // 새 Promise 생성 (체이닝)
    const newPromise: SimulatedPromise = {
      id: nanoid(8),
      state: "pending",
      onFulfilled: [],
      onRejected: [],
    };

    this.promises.set(newPromise.id, newPromise);

    if (promise.state === "fulfilled") {
      // 이미 이행됨 -> 즉시 마이크로태스크 스케줄
      if (onFulfilled) {
        this.context.eventLoop.scheduleMicrotask({
          callback: onFulfilled,
          source: "Promise.then",
          createdAt: this.context.eventLoop.getCurrentTime(),
          preview: "Promise.then callback",
          chainedPromise: newPromise,
          resolvedValue: promise.value,
        });
      } else {
        // 콜백이 없으면 값을 그대로 전달
        this.resolvePromise(newPromise, promise.value);
      }
    } else if (promise.state === "rejected") {
      // 이미 거부됨
      if (onRejected) {
        this.context.eventLoop.scheduleMicrotask({
          callback: onRejected,
          source: "Promise.catch",
          createdAt: this.context.eventLoop.getCurrentTime(),
          preview: "Promise.catch callback",
          chainedPromise: newPromise,
          resolvedValue: promise.reason,
        });
      }
    } else {
      // pending -> 콜백 등록 (체인 정보 포함)
      if (onFulfilled) {
        promise.onFulfilled.push({
          callback: onFulfilled,
          chainedPromise: newPromise,
        });
      }
      if (onRejected) {
        promise.onRejected.push({
          callback: onRejected,
          chainedPromise: newPromise,
        });
      }
    }

    return newPromise;
  }

  /**
   * Promise를 resolve하고 체인 콜백 스케줄
   * Promise unwrapping: 값이 Promise인 경우 재귀적으로 처리
   */
  resolvePromise(promise: SimulatedPromise, value: unknown): void {
    if (promise.state !== "pending") return;

    // Promise unwrapping: 값이 Promise인 경우 재귀적으로 처리
    if (this.isSimulatedPromise(value)) {
      if (value.state === "fulfilled") {
        // 이미 fulfilled인 Promise면 그 값으로 재귀 호출
        this.resolvePromise(promise, value.value);
        return;
      } else if (value.state === "pending") {
        // pending Promise면 then 등록하여 나중에 resolve
        value.onFulfilled.push({
          callback: {
            functionNode: null as unknown as import("acorn").Node,
            capturedScope: null as unknown as import("./types").Scope,
            name: "__promise_unwrap__",
          },
          chainedPromise: promise,
          internalHandler: (resolvedValue: unknown) => {
            this.resolvePromise(promise, resolvedValue);
          },
        });
        return;
      }
      // rejected인 경우 reject 전파
      if (value.state === "rejected") {
        this.rejectPromise(promise, value.reason);
        return;
      }
    }

    // 평상적인 값 처리
    promise.state = "fulfilled";
    promise.value = value;

    // 등록된 then 콜백들을 마이크로태스크로 스케줄
    for (const handler of promise.onFulfilled) {
      // internalHandler가 있으면 직접 호출 (Promise.all/race 내부 처리용)
      if (handler.internalHandler) {
        handler.internalHandler(value);
        continue;
      }

      this.context.eventLoop.scheduleMicrotask({
        callback: handler.callback,
        source: "Promise.then",
        createdAt: this.context.eventLoop.getCurrentTime(),
        preview: "Promise.then callback",
        chainedPromise: handler.chainedPromise,
        resolvedValue: value,
      });
    }
  }

  /**
   * Promise.prototype.catch 처리
   */
  promiseCatch(
    promise: SimulatedPromise,
    onRejected: Closure,
  ): SimulatedPromise {
    return this.promiseThen(promise, undefined, onRejected);
  }

  /**
   * Promise.all 처리
   * 모든 Promise가 fulfill되면 결과 배열 반환, 하나라도 reject되면 reject
   */
  promiseAll(items: unknown[]): SimulatedPromise {
    // 빈 배열인 경우 즉시 fulfilled
    if (items.length === 0) {
      return this.promiseResolve([[]]);
    }

    const resultPromise: SimulatedPromise = {
      id: nanoid(8),
      state: "pending",
      onFulfilled: [],
      onRejected: [],
    };
    this.promises.set(resultPromise.id, resultPromise);

    const results: unknown[] = new Array(items.length);
    let resolvedCount = 0;
    let settled = false;

    const checkAllResolved = () => {
      if (resolvedCount === items.length && !settled) {
        settled = true;
        this.resolvePromise(resultPromise, results);
      }
    };

    items.forEach((item, index) => {
      // Promise가 아닌 값은 Promise.resolve로 래핑
      const promise = this.isSimulatedPromise(item)
        ? item
        : this.promiseResolve([item]);

      if (promise.state === "fulfilled") {
        // 동기적으로 결과 수집 (마이크로태스크 없이!)
        results[index] = promise.value;
        resolvedCount++;
      } else if (promise.state === "rejected" && !settled) {
        // 첫 번째 reject로 전체 reject
        settled = true;
        this.rejectPromise(resultPromise, promise.reason);
      } else if (promise.state === "pending") {
        // pending인 경우 핸들러 등록
        promise.onFulfilled.push({
          callback: {
            functionNode: null as unknown as import("acorn").Node,
            capturedScope: null as unknown as import("./types").Scope,
            name: `__promiseAll_${index}__`,
          },
          chainedPromise: {
            id: `__all_internal_${index}__`,
            state: "pending",
            onFulfilled: [],
            onRejected: [],
          },
          internalHandler: (value: unknown) => {
            if (settled) return;
            results[index] = value;
            resolvedCount++;
            checkAllResolved();
          },
        });

        // reject 핸들러도 등록
        promise.onRejected.push({
          callback: {
            functionNode: null as unknown as import("acorn").Node,
            capturedScope: null as unknown as import("./types").Scope,
            name: "__promiseAll_reject__",
          },
          chainedPromise: resultPromise,
          internalHandler: (reason: unknown) => {
            if (settled) return;
            settled = true;
            this.rejectPromise(resultPromise, reason);
          },
        });
      }
    });

    // 모든 항목 처리 후 단일 체크 (fulfilled 항목만 있을 경우 즉시 resolve)
    checkAllResolved();

    return resultPromise;
  }

  /**
   * Promise.race 처리
   * 첫 번째로 settle된 Promise의 결과 반환
   */
  promiseRace(items: unknown[]): SimulatedPromise {
    const resultPromise: SimulatedPromise = {
      id: nanoid(8),
      state: "pending",
      onFulfilled: [],
      onRejected: [],
    };
    this.promises.set(resultPromise.id, resultPromise);

    let settled = false;

    for (const item of items) {
      const promise = this.isSimulatedPromise(item)
        ? item
        : this.promiseResolve([item]);

      if (promise.state === "fulfilled" && !settled) {
        // 첫 번째 fulfilled로 즉시 resolve
        settled = true;
        // 마이크로태스크로 스케줄하여 비동기 동작 시뮬레이션
        this.context.eventLoop.scheduleMicrotask({
          callback: {
            functionNode: null as unknown as import("acorn").Node,
            capturedScope: null as unknown as import("./types").Scope,
            name: "__promiseRace_resolve__",
          },
          source: "Promise.race",
          createdAt: this.context.eventLoop.getCurrentTime(),
          preview: "Promise.race 결과",
          internalCallback: () => {
            this.resolvePromise(resultPromise, promise.value);
          },
        });
        break;
      } else if (promise.state === "rejected" && !settled) {
        settled = true;
        this.rejectPromise(resultPromise, promise.reason);
        break;
      } else if (promise.state === "pending") {
        // fulfilled 핸들러 등록
        promise.onFulfilled.push({
          callback: {
            functionNode: null as unknown as import("acorn").Node,
            capturedScope: null as unknown as import("./types").Scope,
            name: "__promiseRace_fulfilled__",
          },
          chainedPromise: resultPromise,
          internalHandler: (value: unknown) => {
            if (settled) return;
            settled = true;
            this.resolvePromise(resultPromise, value);
          },
        });

        // rejected 핸들러 등록
        promise.onRejected.push({
          callback: {
            functionNode: null as unknown as import("acorn").Node,
            capturedScope: null as unknown as import("./types").Scope,
            name: "__promiseRace_rejected__",
          },
          chainedPromise: resultPromise,
          internalHandler: (reason: unknown) => {
            if (settled) return;
            settled = true;
            this.rejectPromise(resultPromise, reason);
          },
        });
      }
    }

    return resultPromise;
  }

  /**
   * Promise를 reject하고 체인 콜백 스케줄
   */
  rejectPromise(promise: SimulatedPromise, reason: unknown): void {
    if (promise.state !== "pending") return;

    promise.state = "rejected";
    promise.reason = reason;

    // 등록된 catch 콜백들을 마이크로태스크로 스케줄
    for (const handler of promise.onRejected) {
      this.context.eventLoop.scheduleMicrotask({
        callback: handler.callback,
        source: "Promise.catch",
        createdAt: this.context.eventLoop.getCurrentTime(),
        preview: "Promise.catch callback",
        chainedPromise: handler.chainedPromise,
        resolvedValue: reason,
      });
    }
  }

  /**
   * SimulatedPromise인지 확인
   */
  isSimulatedPromise(value: unknown): value is SimulatedPromise {
    return (
      value !== null &&
      typeof value === "object" &&
      "state" in value &&
      "onFulfilled" in value
    );
  }

  /**
   * 값을 문자열로 변환 (console 출력용)
   */
  private stringify(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";

    const type = typeof value;

    if (type === "string") return value as string;
    if (type === "number" || type === "boolean") return String(value);
    if (type === "function") return "[Function]";

    if (Array.isArray(value)) {
      const items = value.slice(0, 10).map((v) => this.stringify(v));
      return `[${items.join(", ")}${value.length > 10 ? ", ..." : ""}]`;
    }

    if (this.isSimulatedPromise(value)) {
      return `Promise { <${value.state}> }`;
    }

    if (type === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "[Object]";
      }
    }

    return String(value);
  }

  /**
   * 리셋
   */
  reset(): void {
    this.promises.clear();
  }
}
