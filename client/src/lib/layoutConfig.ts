/**
 * 레이아웃 설정 파일
 * UI 레이아웃 관련 수치를 중앙에서 관리
 */

/**
 * 우측 패널 영역의 높이 비율 설정
 * - visualizationArea: 콜스택 + 큐 영역 (기본값: 75%)
 * - consoleArea: 콘솔 출력 영역 (기본값: 25%)
 *
 * 두 값의 합은 항상 100이어야 함
 */
export const LAYOUT_CONFIG = {
  // 우측 패널 높이 비율 (%)
  rightPanel: {
    visualizationArea: 75, // 콜스택 + 큐 영역
    consoleArea: 25,       // 콘솔 영역
  },

  // 메인 영역 폭 비율
  mainArea: {
    codeEditorWidth: '40%',    // 코드 에디터 폭
    callStackWidth: '20%',     // 콜스택 폭
    queuePanelWidth: 'flex-1', // 큐 + 콘솔 영역 (나머지 공간)
  },

  // 콘솔 패널 설정
  console: {
    minHeight: 192,  // 최소 높이 (px) - h-48 = 12 * 16 = 192px
    maxHeight: 480,  // 최대 높이 (px) - h-120 = 30 * 16 = 480px
    defaultHeight: 25, // 기본 높이 (vh 단위)
  },

  // 패널 간격 설정 (Tailwind 단위)
  spacing: {
    panelPadding: 4,        // p-4
    panelGap: 0,            // gap-0 (borders로 구분)
    componentGap: 2,        // gap-2
  },
} as const;

/**
 * CSS 변수로 변환하여 사용할 수 있는 유틸리티
 */
export function getLayoutStyles() {
  return {
    '--visualization-height': `${LAYOUT_CONFIG.rightPanel.visualizationArea}%`,
    '--console-height': `${LAYOUT_CONFIG.rightPanel.consoleArea}vh`,
    '--console-min-height': `${LAYOUT_CONFIG.console.minHeight}px`,
    '--console-max-height': `${LAYOUT_CONFIG.console.maxHeight}px`,
  } as React.CSSProperties;
}
