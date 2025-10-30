# JS Execution Visualizer - Design Guidelines (Compacted)

## Design Philosophy
**Approach:** Reference-based (VSCode, Chrome DevTools, Linear)  
**Core Principle:** Information clarity over visual flair. Prioritize understanding code execution flow.

---

## Typography

**Fonts:**
- **Code:** JetBrains Mono (monospace) - editor, console, queue items
- **UI:** Inter (sans-serif) - labels, buttons
- **Educational:** Source Sans Pro - descriptions, tips

**Scale:**
```
Code Editor: text-sm (14px)
Queue Items: text-xs (12px)
Panel Headers: text-base font-semibold (16px)
Example Titles: text-lg font-medium (18px)
Section Labels: text-xs uppercase tracking-wide font-semibold
Console: text-sm font-mono
Buttons: text-sm font-medium
```

**Rules:** Code = monospace, UI labels = Inter medium, descriptions = Source Sans Pro regular, headers = semibold

---

## Layout & Spacing

**Spacing Units:** `2, 3, 4, 6, 8`
- Tight (internals): `2, 3`
- Standard (related items): `4, 6`  
- Sections (panels): `8`

**Grid Structure (Desktop 1280px+):**
```
┌─────────────────────────────────────────────────┐
│ Top Bar (h-16): Logo, Controls, Speed Slider   │
├──────┬────────────────────┬─────────────────────┤
│ Side │                    │ Call Stack          │
│ bar  │   Code Editor      ├─────────────────────┤
│ 280px│   (flex-1)         │ Microtask Queue     │
│      │                    ├─────────────────────┤
│      │                    │ Task Queue (600px)  │
├──────┴────────────────────┴─────────────────────┤
│ Console (h-48 expandable)                       │
└─────────────────────────────────────────────────┘
```

**Responsive:**
- Tablet (768-1279px): Collapsible sidebar, stacked visualization
- Mobile: Tab-based switching (editor/viz/console)

**Container Rules:**
- Panel padding: `p-4`
- Panel gaps: `gap-0` (borders for separation)
- Scrollable regions: `overflow-y-auto` on panels
- Sticky top bar: `sticky top-0 z-50`

---

## Components

### Top Navigation
- `h-16 flex items-center justify-between px-6`
- Elements: Logo (text-xl font-bold), speed slider (w-32), icon buttons (w-10 h-10), reset button

### Example Sidebar
- `w-80` collapsible to `w-0`
- Search: `h-12 px-3`
- Group headers: `text-xs uppercase font-semibold py-3 px-4`
- Cards: `px-4 py-3 cursor-pointer hover:translate-x-1 transition-transform`
  - Title (font-medium), output preview (text-xs), difficulty badge
- Selected state: `border-l-4`

### Code Editor
- Monaco-inspired with line numbers
- Line numbers: `w-12 text-right pr-3 select-none`
- Current line: `border-l-4` highlight
- Gutter: `w-16` for breakpoints
- Syntax: Prism.js

### Call Stack Panel
- `flex flex-col gap-2 p-4`
- Frames: `border rounded-lg p-3`
  - Function: `text-base font-semibold font-mono`
  - Location: `text-xs mt-1`
  - Variables: Expandable `text-xs font-mono`
- Animations: `transition-all duration-300 ease-out`

### Queue Panels (Task/Microtask)
- `space-y-2 p-4`
- Items: `border rounded p-3 flex items-start gap-3`
  - Icon: `w-8 h-8 rounded-full flex items-center justify-center`
  - Source: `text-xs font-semibold` (setTimeout, Promise.then)
  - Timestamp: `text-xs`
  - Code preview: `text-xs font-mono truncate mt-1`
  - Priority: `w-1 h-full rounded-full` (right edge)
- Next item: `animate-pulse`
- Empty: `flex items-center justify-center h-32 text-sm`

### Console
- `h-48` expandable to `h-96`
- Resize handle: `h-1 cursor-ns-resize hover:h-2`
- Lines: `font-mono text-sm py-1 px-4 border-b`
  - Timestamp: `text-xs w-20`
  - Icon: `w-4 h-4`
  - Message: `flex-1 break-all`
- Auto-scroll bottom
- Clear button: top-right `text-xs px-3 py-1`

### Buttons & Controls
- Primary buttons: `h-10 px-4 rounded-lg font-medium text-sm`
- Icon buttons: `w-10 h-10 rounded-lg flex items-center justify-center`
- Button group: `flex items-center gap-2`
- Active: `active:scale-95 transition-transform duration-100`

### Badges
- Difficulty: `text-xs px-2 py-1 rounded-full font-medium`
- Queue type: `text-xs px-3 py-1 rounded font-semibold uppercase tracking-wide`

---

## Colors & Visual Style

**Borders:** 1px, crisp separation between panels  
**Radius:** `rounded-lg` (8px) cards, `rounded` (4px) buttons  
**Shadows:** `shadow-sm` (slight), `shadow-md` (prominent)  
**Icons:** Heroicons outline, 20px UI (`w-5 h-5`), 16px inline (`w-4 h-4`)

---

## Animations

**Execution Flow:**
- Line highlight: `transition-all duration-300` slide-in
- Stack push: `translate-y-full opacity-0` → `translate-y-0 opacity-100` (250ms)
- Stack pop: reverse (200ms)
- Dequeue: `transition-all duration-400 translate-x-full opacity-0`

**Interactions:**
- Hovers: `transition-colors duration-150`
- Panel collapse: `transition-all duration-300 ease-in-out`
- Next queue item: `animate-pulse` (2s cycle)

**Performance:** Use `will-change: transform` sparingly. Prefer `transition` over CSS animations.

### Micro-interactions
- Line numbers: `opacity-50 hover:opacity-100`
- Queue click: `scale-105` (100ms)
- Expandable chevron: `rotate-0 group-open:rotate-90 transition-transform`
- Content expand: `max-h-0 group-open:max-h-screen transition-all`

---

## Accessibility

**Keyboard:**
- Tab navigation for all controls
- Shortcuts: Space (play/pause), Right Arrow (step), R (reset)
- Focus: `ring-2 ring-offset-2` on all interactive elements
- Skip links for panels

**Screen Readers:**
- ARIA labels on icon buttons
- Live regions for console output
- Status announcements for execution changes
- Landmark roles per panel

**Visual:**
- Contrast: 4.5:1 (normal text), 3:1 (large text)
- Visible focus indicators
- Respect `prefers-reduced-motion`
- 200% zoom support without horizontal scroll

---

## Quality Standards

**Visual:**
- 60fps animations
- Consistent spacing throughout
- Monospace alignment for code/data
- Clear visual grouping

**Production Details:**
- Loading states for examples
- Error states for invalid code
- Disabled states when inapplicable
- Tooltips for advanced features
- First-time user help text
- No orphaned labels

**Panel Headers:** `h-12 flex items-center justify-between px-4` with bottom border, title left, info icon right

---

## Key Implementation Notes

1. **No hero images** - tool/application focus
2. Empty states: Simple SVG line art, `max-w-xs mx-auto`, educational
3. Search debounce: 200ms
4. Hover tooltips: `delay-500`
5. All panels individually scrollable
6. Breakpoint gutter: `w-4 h-full cursor-pointer`
7. Priority flow indicator between queues: `h-8 flex items-center justify-center gap-2`