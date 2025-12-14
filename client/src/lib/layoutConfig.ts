/**
 * 레이아웃 설정 파일
 * jsv9000 스타일의 2분할 레이아웃 설정
 */

export const LAYOUT_CONFIG = {
  // 좌측 패널 (코드 에디터 영역)
  leftPanel: {
    width: '45%',
    minWidth: '400px',
  },

  // 우측 패널 (시각화 영역)
  rightPanel: {
    // 각 큐 패널의 높이
    queueHeight: '120px',
    // 하단 영역 (CallStack + Console)
    bottomSection: 'flex-1',
  },

  // 큐 패널 설정 (수평 배치)
  queue: {
    itemWidth: '160px',
    itemMinWidth: '140px',
    itemGap: '12px',
  },

  // 콘솔 패널 설정
  console: {
    minHeight: 150,
  },

  // 패널 간격 설정 (Tailwind 단위)
  spacing: {
    panelPadding: 4,
    panelGap: 0,
    componentGap: 3,
  },
} as const;

/**
 * CSS 변수로 변환하여 사용할 수 있는 유틸리티
 */
export function getLayoutStyles() {
  return {
    '--left-panel-width': LAYOUT_CONFIG.leftPanel.width,
    '--left-panel-min-width': LAYOUT_CONFIG.leftPanel.minWidth,
    '--queue-height': LAYOUT_CONFIG.rightPanel.queueHeight,
    '--queue-item-width': LAYOUT_CONFIG.queue.itemWidth,
    '--queue-item-gap': LAYOUT_CONFIG.queue.itemGap,
  } as React.CSSProperties;
}
