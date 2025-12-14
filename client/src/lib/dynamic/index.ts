/**
 * 동적 실행 엔진
 * 사용자가 입력한 JavaScript 코드를 파싱하고 실행 트레이스를 생성
 */

import type { ExecutionState } from "@shared/schema";
import { ASTInterpreter } from "./ASTInterpreter";
import { CodeParser } from "./CodeParser";
import type {
  DynamicEngineConfig,
  ExecutionStep,
  LoadCodeResult,
  ParseError,
} from "./types";

export class DynamicExecutionEngine {
  private parser: CodeParser;
  private config: DynamicEngineConfig;

  /** 생성된 실행 단계들 */
  private steps: ExecutionStep[] = [];

  /** 현재 스텝 인덱스 */
  private currentStep = 0;

  /** 자동 재생 인터벌 ID */
  private intervalId: number | null = null;

  /** 파싱 에러 */
  private parseErrors: ParseError[] = [];

  constructor(config: DynamicEngineConfig = {}) {
    this.config = config;
    this.parser = new CodeParser();
  }

  /**
   * 코드 로드 및 실행 트레이스 생성
   */
  loadCode(code: string): LoadCodeResult {
    // 파싱
    const parseResult = this.parser.parse(code);

    if (!parseResult.success || !parseResult.ast) {
      this.parseErrors = parseResult.errors;
      this.steps = [];
      return {
        success: false,
        errors: parseResult.errors,
      };
    }

    // 인터프리터로 실행 트레이스 생성
    const interpreter = new ASTInterpreter({
      maxSteps: this.config.maxSteps ?? 1000,
      maxCallStackDepth: this.config.maxCallStackDepth ?? 100,
      maxLoopIterations: this.config.maxLoopIterations ?? 100,
    });

    try {
      this.steps = interpreter.interpret(
        parseResult.ast,
        parseResult.sourceMap,
      );
      this.currentStep = 0;
      this.parseErrors = [];

      return { success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "알 수 없는 에러";
      this.parseErrors = [{ line: 1, column: 0, message }];

      return {
        success: false,
        errors: this.parseErrors,
      };
    }
  }

  /**
   * 파싱 에러 반환
   */
  getParseErrors(): ParseError[] {
    return this.parseErrors;
  }

  /**
   * 초기 상태 반환
   */
  getInitialState(): ExecutionState {
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

  /**
   * 엔진 리셋
   */
  reset(): void {
    this.currentStep = 0;
    this.stop();
  }

  /**
   * 한 단계 실행
   */
  step(): ExecutionState | null {
    if (this.currentStep >= this.steps.length) {
      return null;
    }

    const stepData = this.steps[this.currentStep];
    this.currentStep++;

    return {
      callStack: stepData.callStack,
      taskQueue: stepData.taskQueue,
      microtaskQueue: stepData.microtaskQueue,
      consoleOutput: stepData.consoleOutput,
      currentLine: stepData.currentLine,
      isRunning: this.currentStep < this.steps.length,
      isPaused: false,
      speed: 500,
    };
  }

  /**
   * 자동 재생 시작
   */
  play(speed: number, onStep: (state: ExecutionState) => void): void {
    this.stop();

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

  /**
   * 재생 중지
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 더 실행할 스텝이 있는지 확인
   */
  hasMoreSteps(): boolean {
    return this.currentStep < this.steps.length;
  }

  /**
   * 전체 스텝 수 반환
   */
  getTotalSteps(): number {
    return this.steps.length;
  }

  /**
   * 현재 스텝 번호 반환
   */
  getCurrentStepNumber(): number {
    return this.currentStep;
  }

  /**
   * 현재 단계 설명 반환
   */
  getCurrentDescription(): string {
    if (this.currentStep === 0) return "실행 준비 완료";
    if (this.currentStep > this.steps.length) return "실행 완료";
    return this.steps[this.currentStep - 1]?.description || "";
  }

  /**
   * 코드가 로드되었는지 확인
   */
  isCodeLoaded(): boolean {
    return this.steps.length > 0;
  }
}

// 타입 재 export
export type { DynamicEngineConfig, ExecutionStep, ParseError } from "./types";
