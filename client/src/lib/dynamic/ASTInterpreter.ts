/**
 * AST 인터프리터
 * JavaScript AST를 해석하고 실행 트레이스를 생성
 */

import type { Node } from "acorn";
import { BuiltinHandlers } from "./BuiltinHandlers";
import { EventLoopSimulator } from "./EventLoopSimulator";
import { ExecutionContext } from "./ExecutionContext";
import type {
  Closure,
  ExecutionStep,
  InterpreterConfig,
  SimulatedMessageChannel,
  SimulatedMessagePort,
} from "./types";
import {
  DEFAULT_INTERPRETER_CONFIG,
  ExecutionLimitError,
  RuntimeError,
} from "./types";
import { nanoid } from "nanoid";

// 타입 헬퍼: Node를 any로 캐스팅
type AnyNode = Node & Record<string, unknown>;

export class ASTInterpreter {
  private context: ExecutionContext;
  private eventLoop: EventLoopSimulator;
  private builtins: BuiltinHandlers;
  private config: InterpreterConfig;

  /** 실행 단계 기록 */
  private steps: ExecutionStep[] = [];

  /** 현재 스텝 카운트 */
  private stepCount = 0;

  /** 루프 반복 카운터 */
  private loopCounters: Map<string, number> = new Map();

  /** 소스 맵 (AST 노드 위치 -> 라인 번호) */
  private sourceMap: Map<number, number> = new Map();

  /** 반환 플래그 */
  private returnValue: unknown = undefined;
  private hasReturned = false;

  /** MessageChannel 저장소 */
  private messageChannels: Map<string, SimulatedMessageChannel> = new Map();

  /** 현재 async 함수 실행 컨텍스트 (await 처리용) */
  private currentAsyncContext: {
    isAsync: boolean;
    remainingStatements: Node[];
    awaitedPromise?: import("./types").SimulatedPromise;
  } | null = null;

  constructor(config: Partial<InterpreterConfig> = {}) {
    this.config = { ...DEFAULT_INTERPRETER_CONFIG, ...config };
    this.context = new ExecutionContext();
    this.eventLoop = new EventLoopSimulator();
    this.builtins = new BuiltinHandlers({
      eventLoop: this.eventLoop,
      executeClosure: this.executeClosure.bind(this),
    });
  }

  /**
   * AST 해석 및 실행 트레이스 생성
   */
  interpret(ast: Node, sourceMap: Map<number, number>): ExecutionStep[] {
    this.reset();
    this.sourceMap = sourceMap;

    try {
      // 전역 스코프 진입
      this.eventLoop.pushToCallStack({
        functionName: "global",
        location: "script",
        variables: {},
      });

      // 프로그램 실행
      this.evaluateNode(ast);

      // 전역 스코프 종료
      this.eventLoop.popFromCallStack();
      this.recordStep("동기 코드 실행 완료");

      // 이벤트 루프 실행
      this.runEventLoop();

      return this.steps;
    } catch (error) {
      // 에러 발생 시 현재 상태까지 반환
      if (error instanceof Error) {
        this.eventLoop.setDescription(`에러: ${error.message}`);
        this.steps.push(this.eventLoop.getSnapshot());
      }
      return this.steps;
    }
  }

  /**
   * 이벤트 루프 실행
   */
  private runEventLoop(): void {
    let loopCount = 0;
    const maxLoops = 100;

    console.log(`[EventLoop] 시작 - 마이크로태스크: ${this.eventLoop.getMicrotaskCount()}, 태스크: ${this.eventLoop.getTaskCount()}`);

    while (this.eventLoop.hasPendingTasks() && loopCount < maxLoops) {
      loopCount++;

      // 1. 마이크로태스크 큐 전체 드레인
      while (!this.eventLoop.isMicrotaskQueueEmpty()) {
        const microtask = this.eventLoop.popMicrotask();
        if (microtask) {
          // internalCallback이 있으면 내부 처리용 (Promise.all/race)
          if (microtask.internalCallback) {
            console.log(`[EventLoop] internalCallback 실행: ${microtask.source}`);
            microtask.internalCallback();
            continue;
          }

          console.log(`[EventLoop] 마이크로태스크 시작: ${microtask.source}`);
          console.log(`  - 큐 남은 개수: ${this.eventLoop.getMicrotaskCount()}`);
          console.log(`  - hasReturned(before): ${this.hasReturned}`);

          this.recordStep(`마이크로태스크 실행: ${microtask.source}`);
          this.eventLoop.pushToCallStack({
            functionName: `${microtask.source} callback`,
            location: microtask.source,
          });

          // resolvedValue가 있으면 콜백 인자로 전달
          const args =
            microtask.resolvedValue !== undefined
              ? [microtask.resolvedValue]
              : [];

          // Promise 콜백 실행 시 에러 처리
          try {
            const result = this.executeClosure(microtask.callback, args);

            console.log(`  - hasReturned(after): ${this.hasReturned}`);

            // Promise 체이닝: 콜백 실행 결과로 연결된 Promise resolve
            if (microtask.chainedPromise) {
              this.builtins.resolvePromise(microtask.chainedPromise, result);
            }
          } catch (e) {
            console.log(`  - 예외 발생:`, e);
            // ThrownError인 경우 Promise 체인으로 reject 전파
            if (this.isThrownError(e) && microtask.chainedPromise) {
              this.builtins.rejectPromise(microtask.chainedPromise, e.error);
            } else {
              // 인터프리터 내부 에러는 다시 throw
              throw e;
            }
          }

          this.eventLoop.popFromCallStack();
          this.recordStep(`마이크로태스크 완료: ${microtask.source}`);
          console.log(`[EventLoop] 마이크로태스크 완료: ${microtask.source}`);
        }
      }

      // 2. 태스크 큐에서 하나 실행
      if (!this.eventLoop.isTaskQueueEmpty()) {
        const task = this.eventLoop.popTask();
        if (task) {
          // 시간 진행 시뮬레이션
          if (task.delay) {
            this.eventLoop.advanceTime(task.delay);
          }

          this.recordStep(`태스크 실행: ${task.source}`);
          this.eventLoop.pushToCallStack({
            functionName: `${task.source} callback`,
            location: task.source,
          });

          this.executeClosure(task.callback, []);

          this.eventLoop.popFromCallStack();
          this.recordStep(`태스크 완료: ${task.source}`);
        }
      }
    }

    if (loopCount >= maxLoops) {
      throw new ExecutionLimitError("이벤트 루프 반복 횟수 초과");
    }

    this.recordStep("실행 완료");
  }

  /**
   * 클로저 실행
   */
  private executeClosure(closure: Closure, args: unknown[]): unknown {
    console.log(`[Closure] 시작 - name=${closure.name}`);

    // 클로저의 캡처된 스코프로 새 함수 스코프 생성
    this.context.enterClosureScope(closure);

    // 파라미터 바인딩
    const funcNode = closure.functionNode as {
      params?: Array<{ type: string; name?: string }>;
      body?: Node;
      async?: boolean;
    };

    if (funcNode.params) {
      for (let i = 0; i < funcNode.params.length; i++) {
        const param = funcNode.params[i];
        if (param.type === "Identifier" && param.name) {
          this.context.declareVariable(param.name, "let");
          this.context.initializeVariable(param.name, args[i]);
        }
      }
    }

    // 함수 본문 실행
    this.hasReturned = false;
    this.returnValue = undefined;

    // async 함수의 경우 특별 처리
    if (closure.isAsync && funcNode.body) {
      const result = this.executeAsyncFunctionBody(funcNode.body as Node);
      this.context.exitScope();
      console.log(`[Closure] 종료(async) - name=${closure.name}`);
      return result;
    }

    if (funcNode.body) {
      this.evaluateNode(funcNode.body as Node);
    }

    // 스코프 종료
    this.context.exitScope();

    console.log(`[Closure] 종료 - name=${closure.name}, hasReturned=${this.hasReturned}`);
    return this.returnValue;
  }

  /**
   * async 함수 본문 실행
   * await를 만나면 나머지 코드를 마이크로태스크로 스케줄
   */
  private executeAsyncFunctionBody(body: Node): import("./types").SimulatedPromise {
    // async 함수는 항상 Promise 반환
    const resultPromise = this.builtins.promiseResolve([undefined]);

    // BlockStatement인 경우 개별 문장 순회
    if (body.type === "BlockStatement") {
      const block = body as unknown as { body: Node[] };
      const statements = block.body;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        this.setLineFromNode(stmt);

        // ExpressionStatement에서 AwaitExpression 찾기
        if (stmt.type === "ExpressionStatement") {
          const exprStmt = stmt as unknown as { expression: Node };
          if (exprStmt.expression.type === "AwaitExpression") {
            // await 표현식 처리
            const awaitExpr = exprStmt.expression as unknown as { argument: Node };
            const promise = this.evaluateNode(awaitExpr.argument);

            this.recordStep("await 대기 중...");

            // 나머지 문장들을 마이크로태스크로 스케줄
            const remainingStatements = statements.slice(i + 1);
            if (remainingStatements.length > 0) {
              // 현재 스코프 캡처
              const capturedScope = this.context.getCurrentScope();

              if (this.builtins.isSimulatedPromise(promise)) {
                // Promise.then으로 나머지 코드 스케줄
                const continuationClosure: Closure = {
                  functionNode: {
                    type: "FunctionExpression",
                    params: [],
                    body: { type: "BlockStatement", body: remainingStatements },
                  } as unknown as Node,
                  capturedScope,
                  name: "__async_continuation__",
                };

                this.builtins.promiseThen(promise, continuationClosure);
              }
            }

            // async 함수 즉시 반환 (나머지는 마이크로태스크로 실행됨)
            return resultPromise;
          }
        }

        // 일반 문장 실행
        this.evaluateNode(stmt);
        if (this.hasReturned) break;
      }
    } else {
      this.evaluateNode(body);
    }

    return resultPromise;
  }

  /**
   * 노드 평가 (Visitor 패턴)
   */
  private evaluateNode(node: Node): unknown {
    this.checkStepLimit();

    if (this.hasReturned) {
      return this.returnValue;
    }

    const n = node as AnyNode;

    switch (node.type) {
      case "Program":
        return this.evaluateProgram(node);
      case "ExpressionStatement":
        return this.evaluateNode(n.expression as Node);
      case "BlockStatement":
        return this.evaluateBlockStatement(node);
      case "VariableDeclaration":
        return this.evaluateVariableDeclaration(node);
      case "FunctionDeclaration":
        return this.evaluateFunctionDeclaration(node);
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        return this.evaluateFunctionExpression(node);
      case "CallExpression":
        return this.evaluateCallExpression(node);
      case "MemberExpression":
        return this.evaluateMemberExpression(node);
      case "Identifier":
        return this.evaluateIdentifier(node);
      case "Literal":
        return (n.value as unknown) ?? null;
      case "BinaryExpression":
        return this.evaluateBinaryExpression(node);
      case "UnaryExpression":
        return this.evaluateUnaryExpression(node);
      case "AssignmentExpression":
        return this.evaluateAssignmentExpression(node);
      case "UpdateExpression":
        return this.evaluateUpdateExpression(node);
      case "LogicalExpression":
        return this.evaluateLogicalExpression(node);
      case "ConditionalExpression":
        return this.evaluateConditionalExpression(node);
      case "IfStatement":
        return this.evaluateIfStatement(node);
      case "ForStatement":
        return this.evaluateForStatement(node);
      case "WhileStatement":
        return this.evaluateWhileStatement(node);
      case "ReturnStatement":
        return this.evaluateReturnStatement(node);
      case "ArrayExpression":
        return this.evaluateArrayExpression(node);
      case "ObjectExpression":
        return this.evaluateObjectExpression(node);
      case "AwaitExpression":
        return this.evaluateAwaitExpression(node);
      case "TemplateLiteral":
        return this.evaluateTemplateLiteral(node);
      case "NewExpression":
        return this.evaluateNewExpression(node);
      case "ThrowStatement":
        return this.evaluateThrowStatement(node);
      case "TryStatement":
        return this.evaluateTryStatement(node);
      default:
        console.warn(`지원하지 않는 노드 타입: ${node.type}`);
        return undefined;
    }
  }

  private evaluateProgram(node: Node): void {
    const program = node as unknown as { body: Node[] };
    for (const statement of program.body) {
      this.setLineFromNode(statement);
      this.evaluateNode(statement);
      if (this.hasReturned) break;
    }
  }

  private evaluateBlockStatement(node: Node): void {
    const block = node as unknown as { body: Node[] };
    this.context.enterScope("block");

    for (const statement of block.body) {
      this.setLineFromNode(statement);
      this.evaluateNode(statement);
      if (this.hasReturned) break;
    }

    this.context.exitScope();
  }

  private evaluateVariableDeclaration(node: Node): void {
    const decl = node as unknown as {
      kind: "var" | "let" | "const";
      declarations: Array<{ id: { name: string }; init?: Node }>;
    };

    for (const declarator of decl.declarations) {
      const name = declarator.id.name;
      this.context.declareVariable(name, decl.kind);

      if (declarator.init) {
        const value = this.evaluateNode(declarator.init);
        this.context.initializeVariable(name, value);
        this.recordStep(
          `변수 선언: ${decl.kind} ${name} = ${this.stringify(value)}`,
        );
      } else {
        this.context.initializeVariable(name, undefined);
        this.recordStep(`변수 선언: ${decl.kind} ${name}`);
      }
    }
  }

  private evaluateFunctionDeclaration(node: Node): void {
    const func = node as unknown as {
      id?: { name: string };
      params: Node[];
      body: Node;
      async?: boolean;
    };
    const name = func.id?.name;

    if (name) {
      const isAsync = func.async === true;
      const closure = this.context.createClosure(node, name, isAsync);
      this.context.declareVariable(name, "var");
      this.context.initializeVariable(name, closure);
      this.recordStep(`함수 선언: ${isAsync ? "async " : ""}${name}()`);
    }
  }

  private evaluateFunctionExpression(node: Node): Closure {
    const func = node as unknown as { id?: { name: string }; async?: boolean };
    const name = func.id?.name || null;
    const isAsync = func.async === true;
    return this.context.createClosure(node, name, isAsync);
  }

  private evaluateCallExpression(node: Node): unknown {
    const call = node as unknown as { callee: Node; arguments: Node[] };
    const args = call.arguments.map((arg) => this.evaluateNode(arg));

    // callee 분석
    if (call.callee.type === "MemberExpression") {
      return this.evaluateMemberCall(call.callee, args);
    }

    if (call.callee.type === "Identifier") {
      const name = (call.callee as unknown as { name: string }).name;

      // 내장 함수 체크
      if (name === "setTimeout") {
        return this.handleSetTimeout(args);
      }

      if (name === "queueMicrotask") {
        return this.handleQueueMicrotask(args);
      }

      if (name === "requestAnimationFrame") {
        return this.handleRequestAnimationFrame(args);
      }

      // 사용자 정의 함수
      const func = this.context.getVariable(name);
      if (func && typeof func === "object" && "functionNode" in func) {
        return this.callUserFunction(func as Closure, args, name);
      }

      // 네이티브 함수 호출 지원 (Promise executor의 resolve/reject 등)
      if (typeof func === "function") {
        console.log(`[Native] 함수 호출: ${name}`);
        const result = (func as (...args: unknown[]) => unknown)(...args);
        console.log(`[Native] 함수 완료: ${name}, hasReturned=${this.hasReturned}`);
        return result;
      }

      throw new RuntimeError(`'${name}'은(는) 함수가 아닙니다`);
    }

    // 즉시 실행 함수 등
    const func = this.evaluateNode(call.callee);
    if (func && typeof func === "object" && "functionNode" in func) {
      return this.callUserFunction(func as Closure, args, "(anonymous)");
    }

    return undefined;
  }

  private evaluateMemberCall(callee: Node, args: unknown[]): unknown {
    const member = callee as unknown as { object: Node; property: Node };
    const objNode = member.object;
    const propNode = member.property;

    // console.log 등 처리
    if (objNode.type === "Identifier") {
      const objName = (objNode as unknown as { name: string }).name;
      const propName = (propNode as unknown as { name: string }).name;
      const fullName = `${objName}.${propName}`;

      if (this.builtins.isBuiltin(fullName)) {
        const result = this.builtins.call(fullName, args);
        this.recordStep(`${fullName}() 호출`);
        return result;
      }

      // Promise.resolve/reject/all/race
      if (objName === "Promise") {
        if (propName === "resolve") {
          return this.builtins.promiseResolve(args);
        }
        if (propName === "reject") {
          return this.builtins.call("Promise.reject", args);
        }
        if (propName === "all") {
          this.recordStep("Promise.all() 호출");
          return this.builtins.promiseAll(args[0] as unknown[]);
        }
        if (propName === "race") {
          this.recordStep("Promise.race() 호출");
          return this.builtins.promiseRace(args[0] as unknown[]);
        }
      }

      // JSON.stringify/parse 처리
      if (objName === "JSON") {
        if (propName === "stringify") {
          this.recordStep("JSON.stringify() 호출");
          return JSON.stringify(args[0]);
        }
        if (propName === "parse") {
          this.recordStep("JSON.parse() 호출");
          return JSON.parse(args[0] as string);
        }
      }
    }

    // 객체 메서드 호출
    const obj = this.evaluateNode(objNode);
    const prop = (propNode as unknown as { name: string }).name;

    // Promise.then/catch 처리
    if (this.builtins.isSimulatedPromise(obj)) {
      if (prop === "then") {
        const [onFulfilled, onRejected] = args;
        this.recordStep("Promise.then() 등록");
        return this.builtins.promiseThen(
          obj,
          onFulfilled as Closure | undefined,
          onRejected as Closure | undefined,
        );
      }
      if (prop === "catch") {
        const [onRejected] = args;
        this.recordStep("Promise.catch() 등록");
        return this.builtins.promiseCatch(obj, onRejected as Closure);
      }
    }

    // MessagePort.postMessage 처리
    if (obj && typeof obj === "object" && "channelId" in obj) {
      const port = obj as SimulatedMessagePort;
      if (prop === "postMessage") {
        port.postMessage(args[0]);
        this.recordStep("port.postMessage() 호출");
        return undefined;
      }
    }

    return undefined;
  }

  private handleSetTimeout(args: unknown[]): number {
    const [callback, delay = 0] = args;

    if (
      callback &&
      typeof callback === "object" &&
      "functionNode" in callback
    ) {
      this.eventLoop.scheduleTask({
        callback: callback as Closure,
        source: "setTimeout",
        delay: Number(delay),
        createdAt: this.eventLoop.getCurrentTime(),
        preview: `setTimeout(${delay}ms)`,
      });
      this.recordStep(`setTimeout() 등록 (${delay}ms)`);
    }

    return Math.floor(Math.random() * 1000000);
  }

  /**
   * queueMicrotask 처리
   */
  private handleQueueMicrotask(args: unknown[]): void {
    const [callback] = args;

    if (
      callback &&
      typeof callback === "object" &&
      "functionNode" in callback
    ) {
      this.eventLoop.scheduleMicrotask({
        callback: callback as Closure,
        source: "queueMicrotask",
        createdAt: this.eventLoop.getCurrentTime(),
        preview: "queueMicrotask callback",
      });
      this.recordStep("queueMicrotask() 등록");
    }
  }

  /**
   * requestAnimationFrame 처리
   */
  private handleRequestAnimationFrame(args: unknown[]): number {
    const [callback] = args;

    if (
      callback &&
      typeof callback === "object" &&
      "functionNode" in callback
    ) {
      // rAF는 task로 처리 (실제로는 렌더링 전 실행)
      this.eventLoop.scheduleTask({
        callback: callback as Closure,
        source: "requestAnimationFrame",
        delay: 16, // ~60fps 시뮬레이션
        createdAt: this.eventLoop.getCurrentTime(),
        preview: "requestAnimationFrame callback",
      });
      this.recordStep("requestAnimationFrame() 등록");
    }

    return Math.floor(Math.random() * 1000000);
  }

  /**
   * new 연산자 처리
   */
  private evaluateNewExpression(node: Node): unknown {
    const expr = node as unknown as { callee: Node; arguments: Node[] };
    const args = expr.arguments.map((arg) => this.evaluateNode(arg));

    if (expr.callee.type === "Identifier") {
      const name = (expr.callee as unknown as { name: string }).name;

      // MessageChannel 생성자
      if (name === "MessageChannel") {
        return this.createMessageChannel();
      }

      // Promise 생성자
      if (name === "Promise") {
        const [executor] = args;
        if (executor && typeof executor === "object" && "functionNode" in executor) {
          const promise = this.builtins.createPromise(executor as Closure);

          // executor 동기 실행 (resolve, reject 전달)
          const { resolve, reject } = promise.value as {
            resolve: (value: unknown) => void;
            reject: (reason: unknown) => void;
          };

          this.executeClosure(executor as Closure, [resolve, reject]);

          // promise.value 정리 (executor 참조 제거)
          promise.value = undefined;

          return promise;
        }
      }
    }

    throw new RuntimeError(`'new ${expr.callee.type}' 생성자를 지원하지 않습니다`);
  }

  /**
   * MessageChannel 생성
   */
  private createMessageChannel(): SimulatedMessageChannel {
    const channelId = nanoid(8);

    const channel: SimulatedMessageChannel = {
      id: channelId,
      port1: {
        id: `${channelId}_port1`,
        channelId,
        onmessage: null,
        postMessage: () => {}, // port2에서 호출
      },
      port2: {
        id: `${channelId}_port2`,
        channelId,
        onmessage: null,
        postMessage: () => {
          // port1.onmessage를 task로 스케줄
          const port1 = channel.port1;
          if (port1.onmessage) {
            this.eventLoop.scheduleTask({
              callback: port1.onmessage,
              source: "MessageChannel",
              createdAt: this.eventLoop.getCurrentTime(),
              preview: "MessageChannel task",
            });
          }
        },
      },
    };

    this.messageChannels.set(channelId, channel);
    this.recordStep("new MessageChannel() 생성");
    return channel;
  }

  private callUserFunction(
    closure: Closure,
    args: unknown[],
    name: string,
  ): unknown {
    // 콜스택 깊이 체크
    if (this.eventLoop.getCallStackDepth() >= this.config.maxCallStackDepth) {
      throw new ExecutionLimitError("콜스택 깊이 초과 (재귀 호출 제한)");
    }

    this.eventLoop.pushToCallStack({
      functionName: `${name}()`,
      location: this.getCurrentLocation(),
      variables: this.context.getVariablesSnapshot(),
    });
    this.recordStep(`함수 호출: ${name}()`);

    const result = this.executeClosure(closure, args);

    this.eventLoop.popFromCallStack();
    this.recordStep(`함수 종료: ${name}()`);

    return result;
  }

  private evaluateMemberExpression(node: Node): unknown {
    const member = node as unknown as {
      object: Node;
      property: Node;
      computed: boolean;
    };

    const obj = this.evaluateNode(member.object) as Record<string, unknown>;
    if (!obj) return undefined;

    const prop = member.computed
      ? String(this.evaluateNode(member.property))
      : (member.property as unknown as { name: string }).name;

    // MessageChannel 포트 속성 접근
    if (typeof obj === "object" && "port1" in obj && "port2" in obj) {
      const channel = obj as unknown as SimulatedMessageChannel;
      if (prop === "port1") return channel.port1;
      if (prop === "port2") return channel.port2;
    }

    return obj[prop];
  }

  private evaluateIdentifier(node: Node): unknown {
    const id = node as unknown as { name: string };

    // 특수 식별자
    if (id.name === "undefined") return undefined;
    if (id.name === "null") return null;
    if (id.name === "true") return true;
    if (id.name === "false") return false;

    return this.context.getVariable(id.name);
  }

  private evaluateBinaryExpression(node: Node): unknown {
    const expr = node as unknown as {
      left: Node;
      right: Node;
      operator: string;
    };
    const left = this.evaluateNode(expr.left);
    const right = this.evaluateNode(expr.right);

    switch (expr.operator) {
      case "+":
        return (left as number) + (right as number);
      case "-":
        return (left as number) - (right as number);
      case "*":
        return (left as number) * (right as number);
      case "/":
        return (left as number) / (right as number);
      case "%":
        return (left as number) % (right as number);
      case "**":
        return (left as number) ** (right as number);
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case "===":
        return left === right;
      case "!==":
        return left !== right;
      case "<":
        return (left as number) < (right as number);
      case ">":
        return (left as number) > (right as number);
      case "<=":
        return (left as number) <= (right as number);
      case ">=":
        return (left as number) >= (right as number);
      default:
        return undefined;
    }
  }

  private evaluateUnaryExpression(node: Node): unknown {
    const expr = node as unknown as { operator: string; argument: Node };
    const arg = this.evaluateNode(expr.argument);

    switch (expr.operator) {
      case "!":
        return !arg;
      case "-":
        return -(arg as number);
      case "+":
        return +(arg as number);
      case "typeof":
        return typeof arg;
      default:
        return undefined;
    }
  }

  private evaluateAssignmentExpression(node: Node): unknown {
    const expr = node as unknown as {
      left: Node;
      right: Node;
      operator: string;
    };
    const value = this.evaluateNode(expr.right);

    // MemberExpression 할당 (port.onmessage = callback)
    if (expr.left.type === "MemberExpression") {
      const member = expr.left as unknown as { object: Node; property: Node };
      const obj = this.evaluateNode(member.object);
      const propName = (member.property as unknown as { name: string }).name;

      // MessagePort.onmessage 할당 처리
      if (
        obj &&
        typeof obj === "object" &&
        "channelId" in obj &&
        propName === "onmessage"
      ) {
        (obj as SimulatedMessagePort).onmessage = value as Closure;
        this.recordStep("port.onmessage 등록");
        return value;
      }

      // 일반 객체 속성 할당
      if (obj && typeof obj === "object") {
        (obj as Record<string, unknown>)[propName] = value;
        return value;
      }
    }

    if (expr.left.type === "Identifier") {
      const name = (expr.left as unknown as { name: string }).name;

      if (expr.operator === "=") {
        this.context.setVariable(name, value);
      } else {
        const current = this.context.getVariable(name) as number;
        let newValue: number;

        switch (expr.operator) {
          case "+=":
            newValue = current + (value as number);
            break;
          case "-=":
            newValue = current - (value as number);
            break;
          case "*=":
            newValue = current * (value as number);
            break;
          case "/=":
            newValue = current / (value as number);
            break;
          default:
            newValue = value as number;
        }

        this.context.setVariable(name, newValue);
        return newValue;
      }

      return value;
    }

    return value;
  }

  private evaluateUpdateExpression(node: Node): unknown {
    const expr = node as unknown as {
      argument: Node;
      operator: string;
      prefix: boolean;
    };

    if (expr.argument.type === "Identifier") {
      const name = (expr.argument as unknown as { name: string }).name;
      const current = this.context.getVariable(name) as number;
      const newValue = expr.operator === "++" ? current + 1 : current - 1;

      this.context.setVariable(name, newValue);

      return expr.prefix ? newValue : current;
    }

    return undefined;
  }

  private evaluateLogicalExpression(node: Node): unknown {
    const expr = node as unknown as {
      left: Node;
      right: Node;
      operator: string;
    };

    const left = this.evaluateNode(expr.left);

    switch (expr.operator) {
      case "&&":
        return left ? this.evaluateNode(expr.right) : left;
      case "||":
        return left ? left : this.evaluateNode(expr.right);
      case "??":
        return left != null ? left : this.evaluateNode(expr.right);
      default:
        return undefined;
    }
  }

  private evaluateConditionalExpression(node: Node): unknown {
    const expr = node as unknown as {
      test: Node;
      consequent: Node;
      alternate: Node;
    };
    const test = this.evaluateNode(expr.test);
    return test
      ? this.evaluateNode(expr.consequent)
      : this.evaluateNode(expr.alternate);
  }

  private evaluateIfStatement(node: Node): void {
    const stmt = node as unknown as {
      test: Node;
      consequent: Node;
      alternate?: Node;
    };
    const test = this.evaluateNode(stmt.test);

    if (test) {
      this.evaluateNode(stmt.consequent);
    } else if (stmt.alternate) {
      this.evaluateNode(stmt.alternate);
    }
  }

  private evaluateForStatement(node: Node): void {
    const stmt = node as unknown as {
      init?: Node;
      test?: Node;
      update?: Node;
      body: Node;
    };

    this.context.enterScope("block");
    const loopId = `for_${node.start}`;
    this.loopCounters.set(loopId, 0);

    if (stmt.init) {
      this.evaluateNode(stmt.init);
    }

    while (true) {
      this.checkLoopLimit(loopId);

      if (stmt.test) {
        const test = this.evaluateNode(stmt.test);
        if (!test) break;
      }

      this.evaluateNode(stmt.body);
      if (this.hasReturned) break;

      if (stmt.update) {
        this.evaluateNode(stmt.update);
      }
    }

    this.context.exitScope();
  }

  private evaluateWhileStatement(node: Node): void {
    const stmt = node as unknown as { test: Node; body: Node };
    const loopId = `while_${node.start}`;
    this.loopCounters.set(loopId, 0);

    while (true) {
      this.checkLoopLimit(loopId);

      const test = this.evaluateNode(stmt.test);
      if (!test) break;

      this.evaluateNode(stmt.body);
      if (this.hasReturned) break;
    }
  }

  private evaluateReturnStatement(node: Node): void {
    const stmt = node as unknown as { argument?: Node };

    if (stmt.argument) {
      this.returnValue = this.evaluateNode(stmt.argument);
    } else {
      this.returnValue = undefined;
    }

    this.hasReturned = true;
    this.recordStep(`return ${this.stringify(this.returnValue)}`);
  }

  private evaluateArrayExpression(node: Node): unknown[] {
    const expr = node as unknown as { elements: (Node | null)[] };
    return expr.elements.map((el) => (el ? this.evaluateNode(el) : undefined));
  }

  private evaluateObjectExpression(node: Node): Record<string, unknown> {
    const expr = node as unknown as {
      properties: Array<{
        key: Node;
        value: Node;
        computed: boolean;
      }>;
    };

    const obj: Record<string, unknown> = {};

    for (const prop of expr.properties) {
      let key: string;

      if (prop.computed) {
        key = String(this.evaluateNode(prop.key));
      } else if (prop.key.type === "Identifier") {
        key = (prop.key as unknown as { name: string }).name;
      } else {
        key = String((prop.key as unknown as { value: unknown }).value);
      }

      obj[key] = this.evaluateNode(prop.value);
    }

    return obj;
  }

  private evaluateAwaitExpression(node: Node): unknown {
    const expr = node as unknown as { argument: Node };
    const promise = this.evaluateNode(expr.argument);

    if (this.builtins.isSimulatedPromise(promise)) {
      this.recordStep("await 대기 중...");

      // await은 마이크로태스크로 스케줄됨을 시뮬레이션
      // 실제로는 함수 일시정지가 필요하지만, 간단한 시뮬레이션에서는
      // Promise가 이미 fulfilled인 경우 값을 반환
      if (promise.state === "fulfilled") {
        return promise.value;
      }

      // pending인 경우 undefined 반환 (실제로는 일시정지되어야 함)
      return undefined;
    }

    // Promise가 아닌 값은 즉시 반환
    return promise;
  }

  private evaluateTemplateLiteral(node: Node): string {
    const literal = node as unknown as {
      quasis: Array<{ value: { cooked: string } }>;
      expressions: Node[];
    };

    let result = "";

    for (let i = 0; i < literal.quasis.length; i++) {
      result += literal.quasis[i].value.cooked;

      if (i < literal.expressions.length) {
        const value = this.evaluateNode(literal.expressions[i]);
        result += String(value);
      }
    }

    return result;
  }

  /**
   * throw 문 평가
   */
  private evaluateThrowStatement(node: Node): never {
    const stmt = node as unknown as { argument: Node };
    const error = this.evaluateNode(stmt.argument);
    this.recordStep(`throw ${this.stringify(error)}`);

    // ThrownError로 래핑하여 throw (인터프리터 내부 에러와 구분)
    const thrownError: import("./types").ThrownError = {
      __isThrownError: true,
      error,
    };
    throw thrownError;
  }

  /**
   * try-catch-finally 문 평가
   */
  private evaluateTryStatement(node: Node): unknown {
    const stmt = node as unknown as {
      block: Node;
      handler?: {
        param?: { name: string };
        body: Node;
      };
      finalizer?: Node;
    };

    let result: unknown;
    let caughtError: unknown = undefined;
    let hasError = false;

    // try 블록 실행
    this.recordStep("try 블록 시작");
    try {
      result = this.evaluateNode(stmt.block);
    } catch (e) {
      // ThrownError인지 확인 (사용자 코드에서 throw된 에러)
      if (this.isThrownError(e)) {
        hasError = true;
        caughtError = e.error;
      } else {
        // 인터프리터 내부 에러는 다시 throw
        throw e;
      }
    }

    // catch 블록 실행 (에러가 있고 handler가 있는 경우)
    if (hasError && stmt.handler) {
      this.recordStep("catch 블록 시작");

      // 블록 스코프 생성
      this.context.enterScope("block");

      // 에러 파라미터 바인딩
      if (stmt.handler.param) {
        this.context.declareVariable(stmt.handler.param.name, "let");
        this.context.initializeVariable(stmt.handler.param.name, caughtError);
      }

      result = this.evaluateNode(stmt.handler.body);
      this.context.exitScope();
      hasError = false; // 에러 처리 완료
    }

    // finally 블록 실행 (항상 실행)
    if (stmt.finalizer) {
      this.recordStep("finally 블록 시작");
      this.evaluateNode(stmt.finalizer);
    }

    // catch 없이 에러가 남아있으면 다시 throw
    if (hasError) {
      const thrownError: import("./types").ThrownError = {
        __isThrownError: true,
        error: caughtError,
      };
      throw thrownError;
    }

    return result;
  }

  /**
   * ThrownError 타입 가드
   */
  private isThrownError(e: unknown): e is import("./types").ThrownError {
    return (
      e !== null &&
      typeof e === "object" &&
      "__isThrownError" in e &&
      (e as import("./types").ThrownError).__isThrownError === true
    );
  }

  // ===== 유틸리티 메서드 =====

  private setLineFromNode(node: Node): void {
    const line = this.sourceMap.get(node.start);
    if (line !== undefined) {
      this.eventLoop.setCurrentLine(line);
    }
  }

  private getCurrentLocation(): string {
    return `line ${this.eventLoop.getSnapshot().currentLine || "?"}`;
  }

  private recordStep(description: string): void {
    this.eventLoop.setDescription(description);

    // 콜스택 최상단 프레임의 변수 업데이트
    const snapshot = this.eventLoop.getSnapshot();
    if (snapshot.callStack.length > 0) {
      const topFrame = snapshot.callStack[snapshot.callStack.length - 1];
      topFrame.variables = this.context.getVariablesSnapshot();
    }

    this.steps.push(this.eventLoop.getSnapshot());
    this.stepCount++;
  }

  private checkStepLimit(): void {
    if (this.stepCount >= this.config.maxSteps) {
      throw new ExecutionLimitError(
        `최대 실행 단계(${this.config.maxSteps})를 초과했습니다`,
      );
    }
  }

  private checkLoopLimit(loopId: string): void {
    const count = (this.loopCounters.get(loopId) || 0) + 1;
    this.loopCounters.set(loopId, count);

    if (count > this.config.maxLoopIterations) {
      throw new ExecutionLimitError(
        `루프 반복 횟수(${this.config.maxLoopIterations})를 초과했습니다`,
      );
    }
  }

  private stringify(value: unknown): string {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "function") return "[Function]";
    if (typeof value === "object" && "functionNode" in value)
      return "[Function]";
    if (this.builtins.isSimulatedPromise(value)) {
      return `Promise { <${value.state}> }`;
    }
    return String(value);
  }

  private reset(): void {
    this.steps = [];
    this.stepCount = 0;
    this.loopCounters.clear();
    this.hasReturned = false;
    this.returnValue = undefined;
    this.messageChannels.clear();
    this.currentAsyncContext = null;
    this.context.reset();
    this.eventLoop.reset();
    this.builtins.reset();
  }
}
