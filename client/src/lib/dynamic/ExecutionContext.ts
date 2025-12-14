/**
 * 실행 컨텍스트 관리
 * 스코프 체인, 변수 바인딩, 클로저 관리
 */

import type { Node } from "acorn";
import { nanoid } from "nanoid";
import type {
  Closure,
  Scope,
  ScopeType,
  VariableBinding,
  VariableKind,
} from "./types";
import { RuntimeError } from "./types";

export class ExecutionContext {
  /** 현재 스코프 */
  private currentScope: Scope;

  /** 전역 스코프 */
  private globalScope: Scope;

  /** 등록된 클로저 맵 */
  private closures: Map<string, Closure> = new Map();

  constructor() {
    // 전역 스코프 초기화
    this.globalScope = {
      id: nanoid(8),
      type: "global",
      parent: null,
      variables: new Map(),
    };
    this.currentScope = this.globalScope;
  }

  /**
   * 새 스코프 진입
   */
  enterScope(type: ScopeType, thisBinding?: unknown): Scope {
    const newScope: Scope = {
      id: nanoid(8),
      type,
      parent: this.currentScope,
      variables: new Map(),
      thisBinding,
    };
    this.currentScope = newScope;
    return newScope;
  }

  /**
   * 현재 스코프 종료
   */
  exitScope(): Scope | null {
    if (this.currentScope.parent) {
      const exitedScope = this.currentScope;
      this.currentScope = this.currentScope.parent;
      return exitedScope;
    }
    return null;
  }

  /**
   * 현재 스코프 반환
   */
  getCurrentScope(): Scope {
    return this.currentScope;
  }

  /**
   * 전역 스코프 반환
   */
  getGlobalScope(): Scope {
    return this.globalScope;
  }

  /**
   * 변수 선언
   */
  declareVariable(name: string, kind: VariableKind): void {
    // var는 함수 스코프, let/const는 블록 스코프
    const targetScope =
      kind === "var" ? this.getFunctionScope() : this.currentScope;

    // 같은 스코프에서 let/const 중복 선언 검사
    if (kind !== "var" && targetScope.variables.has(name)) {
      throw new RuntimeError(`'${name}'은(는) 이미 선언되었습니다`);
    }

    const binding: VariableBinding = {
      name,
      kind,
      value: undefined,
      initialized: false,
    };

    targetScope.variables.set(name, binding);
  }

  /**
   * 변수 초기화 (선언 후 값 할당)
   */
  initializeVariable(name: string, value: unknown): void {
    const binding = this.findBinding(name);

    if (!binding) {
      throw new RuntimeError(`'${name}'이(가) 정의되지 않았습니다`);
    }

    binding.value = value;
    binding.initialized = true;
  }

  /**
   * 변수 값 설정 (재할당)
   */
  setVariable(name: string, value: unknown): void {
    const binding = this.findBinding(name);

    if (!binding) {
      // 선언되지 않은 변수에 할당 -> 전역 변수로 생성 (strict mode 아님)
      this.globalScope.variables.set(name, {
        name,
        kind: "var",
        value,
        initialized: true,
      });
      return;
    }

    // const 재할당 검사
    if (binding.kind === "const" && binding.initialized) {
      throw new RuntimeError(`'${name}'은(는) 상수이므로 재할당할 수 없습니다`);
    }

    binding.value = value;
    binding.initialized = true;
  }

  /**
   * 변수 값 조회
   */
  getVariable(name: string): unknown {
    const binding = this.findBinding(name);

    if (!binding) {
      throw new RuntimeError(`'${name}'이(가) 정의되지 않았습니다`);
    }

    // TDZ (Temporal Dead Zone) 검사 - let/const 초기화 전 접근
    if (!binding.initialized && binding.kind !== "var") {
      throw new RuntimeError(
        `'${name}'에 접근할 수 없습니다 - 초기화 전입니다 (TDZ)`,
      );
    }

    return binding.value;
  }

  /**
   * 변수 존재 여부 확인
   */
  hasVariable(name: string): boolean {
    return this.findBinding(name) !== null;
  }

  /**
   * 스코프 체인에서 변수 바인딩 찾기
   */
  private findBinding(name: string): VariableBinding | null {
    // [DEBUG] 스코프 체인 탐색 로그
    if (name === "resolve") {
      console.log(`[Scope] findBinding('${name}')`);
      let debugScope: Scope | null = this.currentScope;
      let depth = 0;
      while (debugScope) {
        const vars = Array.from(debugScope.variables.keys());
        console.log(`  [${depth}] type=${debugScope.type}, vars=[${vars.join(", ")}]`);
        debugScope = debugScope.parent;
        depth++;
      }
    }

    let scope: Scope | null = this.currentScope;

    while (scope) {
      const binding = scope.variables.get(name);
      if (binding) {
        if (name === "resolve") {
          console.log(`  → found!`);
        }
        return binding;
      }
      scope = scope.parent;
    }

    if (name === "resolve") {
      console.log(`  → NOT FOUND!`);
    }
    return null;
  }

  /**
   * 가장 가까운 함수 스코프 찾기 (var 호이스팅용)
   */
  private getFunctionScope(): Scope {
    let scope: Scope = this.currentScope;

    while (scope.type === "block" && scope.parent) {
      scope = scope.parent;
    }

    return scope;
  }

  /**
   * 클로저 생성
   */
  createClosure(
    functionNode: Node,
    name: string | null = null,
    isAsync = false,
  ): Closure {
    const closure: Closure = {
      functionNode,
      capturedScope: this.currentScope,
      name,
      isAsync,
    };

    const id = nanoid(8);
    this.closures.set(id, closure);

    return closure;
  }

  /**
   * 클로저의 캡처된 스코프로 컨텍스트 전환
   */
  enterClosureScope(closure: Closure): Scope {
    // 클로저가 캡처한 스코프를 부모로 하는 새 함수 스코프 생성
    const savedCurrentScope = this.currentScope;
    this.currentScope = closure.capturedScope;

    const newScope = this.enterScope("function");

    // 원래 스코프 복원 (enterScope에서 parent 설정됨)
    this.currentScope = newScope;

    return newScope;
  }

  /**
   * 현재 스코프의 변수 목록 반환 (디버깅/시각화용)
   */
  getVariablesSnapshot(): Record<string, unknown> {
    const variables: Record<string, unknown> = {};

    for (const [name, binding] of Array.from(this.currentScope.variables)) {
      if (binding.initialized) {
        variables[name] = this.serializeValue(binding.value);
      }
    }

    return variables;
  }

  /**
   * 전체 스코프 체인의 변수 목록 반환
   */
  getAllVariablesSnapshot(): Record<string, unknown> {
    const variables: Record<string, unknown> = {};
    let scope: Scope | null = this.currentScope;

    while (scope) {
      for (const [name, binding] of Array.from(scope.variables)) {
        // 더 가까운 스코프의 변수가 우선
        if (!(name in variables) && binding.initialized) {
          variables[name] = this.serializeValue(binding.value);
        }
      }
      scope = scope.parent;
    }

    return variables;
  }

  /**
   * 값 직렬화 (시각화용)
   */
  private serializeValue(value: unknown): unknown {
    if (value === null) return null;
    if (value === undefined) return undefined;

    const type = typeof value;

    if (type === "string" || type === "number" || type === "boolean") {
      return value;
    }

    if (type === "function") {
      return "[Function]";
    }

    if (Array.isArray(value)) {
      // 깊이 제한
      return value.slice(0, 10).map((v) => this.serializeValue(v));
    }

    if (type === "object") {
      // SimulatedPromise 처리
      if (value && "state" in (value as object)) {
        const promise = value as { state: string };
        return `[Promise: ${promise.state}]`;
      }

      // 일반 객체는 간략화
      return "[Object]";
    }

    return String(value);
  }

  /**
   * 컨텍스트 리셋
   */
  reset(): void {
    this.globalScope = {
      id: nanoid(8),
      type: "global",
      parent: null,
      variables: new Map(),
    };
    this.currentScope = this.globalScope;
    this.closures.clear();
  }
}
