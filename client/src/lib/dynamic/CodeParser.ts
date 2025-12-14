/**
 * JavaScript 코드 파서 (Acorn 기반)
 * 코드를 AST로 변환하고 소스 위치 매핑을 생성
 */

import type { Node } from "acorn";
import * as acorn from "acorn";
import type { ParseError, ParseResult } from "./types";

/** 지원하지 않는 문법 목록 */
const UNSUPPORTED_SYNTAX = [
  "ClassDeclaration",
  "ClassExpression",
  "ImportDeclaration",
  "ExportNamedDeclaration",
  "ExportDefaultDeclaration",
  "ExportAllDeclaration",
  "YieldExpression",
  "MetaProperty",
  "WithStatement",
];

export class CodeParser {
  private sourceLines: string[] = [];

  /**
   * JavaScript 코드를 파싱하여 AST 생성
   */
  parse(code: string): ParseResult {
    // 입력 검증
    if (!code || !code.trim()) {
      return {
        success: false,
        errors: [{ line: 1, column: 0, message: "코드가 비어있습니다" }],
        sourceMap: new Map(),
      };
    }

    this.sourceLines = code.split("\n");
    const sourceMap = new Map<number, number>();

    try {
      // Acorn으로 파싱
      const ast = acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: "script",
        locations: true, // 소스 위치 정보 포함
        allowReturnOutsideFunction: true, // 전역 스코프에서 return 허용
        allowAwaitOutsideFunction: true, // top-level await 허용
      });

      // 지원하지 않는 문법 검사
      const unsupportedErrors = this.checkUnsupportedSyntax(ast);
      if (unsupportedErrors.length > 0) {
        return {
          success: false,
          errors: unsupportedErrors,
          sourceMap,
        };
      }

      // 소스 맵 생성
      this.buildSourceMap(ast, sourceMap);

      return {
        success: true,
        ast,
        errors: [],
        sourceMap,
      };
    } catch (error) {
      // Acorn 파싱 에러 처리
      const parseError = this.formatAcornError(error);
      return {
        success: false,
        errors: [parseError],
        sourceMap,
      };
    }
  }

  /**
   * 코드 유효성 검사만 수행 (파싱 없이)
   */
  validate(code: string): ParseError[] {
    const result = this.parse(code);
    return result.errors;
  }

  /**
   * 지원하지 않는 문법 검사
   */
  private checkUnsupportedSyntax(ast: Node): ParseError[] {
    const errors: ParseError[] = [];

    this.walkAST(ast, (node) => {
      if (UNSUPPORTED_SYNTAX.includes(node.type)) {
        const loc = (node as acorn.Node & { loc?: acorn.SourceLocation }).loc;
        errors.push({
          line: loc?.start.line ?? 1,
          column: loc?.start.column ?? 0,
          message: `지원하지 않는 문법입니다: ${this.getSyntaxName(node.type)}`,
        });
      }
    });

    return errors;
  }

  /**
   * AST 순회
   */
  private walkAST(node: Node, callback: (node: Node) => void): void {
    callback(node);

    // 자식 노드 순회
    for (const key of Object.keys(node)) {
      const child = (node as unknown as Record<string, unknown>)[key];

      if (child && typeof child === "object") {
        if (Array.isArray(child)) {
          for (const item of child) {
            if (item && typeof item === "object" && "type" in item) {
              this.walkAST(item as Node, callback);
            }
          }
        } else if ("type" in child) {
          this.walkAST(child as Node, callback);
        }
      }
    }
  }

  /**
   * 소스 맵 생성 (AST 노드 시작 위치 -> 라인 번호)
   */
  private buildSourceMap(ast: Node, sourceMap: Map<number, number>): void {
    this.walkAST(ast, (node) => {
      const loc = (node as acorn.Node & { loc?: acorn.SourceLocation }).loc;
      if (loc) {
        sourceMap.set(node.start, loc.start.line);
      }
    });
  }

  /**
   * Acorn 에러를 ParseError로 변환
   */
  private formatAcornError(error: unknown): ParseError {
    if (error instanceof SyntaxError) {
      // Acorn의 SyntaxError는 pos, loc 속성을 가짐
      const acornError = error as SyntaxError & {
        pos?: number;
        loc?: { line: number; column: number };
      };

      return {
        line: acornError.loc?.line ?? 1,
        column: acornError.loc?.column ?? 0,
        message: this.translateErrorMessage(error.message),
      };
    }

    return {
      line: 1,
      column: 0,
      message: error instanceof Error ? error.message : "알 수 없는 파싱 에러",
    };
  }

  /**
   * 에러 메시지 한글화
   */
  private translateErrorMessage(message: string): string {
    const translations: Record<string, string> = {
      "Unexpected token": "예상치 못한 토큰",
      "Unexpected end of input": "코드가 불완전하게 끝났습니다",
      "Identifier directly after number":
        "숫자 바로 뒤에 식별자를 사용할 수 없습니다",
      "Unterminated string constant": "문자열이 닫히지 않았습니다",
      "Invalid regular expression": "잘못된 정규표현식",
      "Octal literals are not allowed": "8진수 리터럴은 허용되지 않습니다",
      "Missing semicolon": "세미콜론이 필요합니다",
      "Unexpected character": "예상치 못한 문자",
    };

    for (const [eng, kor] of Object.entries(translations)) {
      if (message.includes(eng)) {
        return message.replace(eng, kor);
      }
    }

    return message;
  }

  /**
   * 문법 타입을 사용자 친화적 이름으로 변환
   */
  private getSyntaxName(type: string): string {
    const names: Record<string, string> = {
      ClassDeclaration: "class 선언",
      ClassExpression: "class 표현식",
      ImportDeclaration: "import 문",
      ExportNamedDeclaration: "export 문",
      ExportDefaultDeclaration: "export default 문",
      ExportAllDeclaration: "export * 문",
      YieldExpression: "yield 표현식 (제너레이터)",
      MetaProperty: "import.meta",
      WithStatement: "with 문",
    };

    return names[type] || type;
  }

  /**
   * 특정 라인의 소스 코드 가져오기
   */
  getSourceLine(line: number): string {
    return this.sourceLines[line - 1] || "";
  }

  /**
   * 함수 코드 미리보기 생성
   */
  getFunctionPreview(node: Node, maxLength = 50): string {
    const loc = (node as acorn.Node & { loc?: acorn.SourceLocation }).loc;
    if (!loc) return "callback";

    const startLine = loc.start.line;
    const endLine = loc.end.line;

    if (startLine === endLine) {
      const line = this.getSourceLine(startLine);
      const preview = line.substring(loc.start.column, loc.end.column).trim();
      return preview.length > maxLength
        ? `${preview.substring(0, maxLength)}...`
        : preview;
    }

    // 여러 줄인 경우 첫 줄만 표시
    const firstLine = this.getSourceLine(startLine);
    const preview = firstLine.substring(loc.start.column).trim();
    return preview.length > maxLength
      ? `${preview.substring(0, maxLength)}...`
      : `${preview}...`;
  }
}
