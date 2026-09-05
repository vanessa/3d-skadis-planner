# Toolcraft Design Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the board planner after Toolcraft's design direction: dark canvas-first workspace, floating 300 px controls panel, Inter, dense type, neutral preview geometry with the accent reserved for interaction, plus a dark/light/system theme toggle. Behaviour and the solver do not change.

**Architecture:** Tokens become the Toolcraft palette with a `createTheme` light override applied to `<html>`. New presentation components (`Panel`, `PanelSection`, `fields`, `ThemeToggle`, `Canvas`, `SummaryChip`) replace the card layout; `InputPanel`, `Preview`, `PrintList`, `ErrorBoundary` are restyled. `App` keeps its state shape and gains theme wiring.

**Tech Stack:** Existing Vite 8 + React 19 + TypeScript + StyleX 0.19 (`defineVars`, `createTheme`, `stylex.create`, `stylex.props`) + Vitest 5/jsdom/Testing Library. New dependency: `@fontsource-variable/inter`.

Spec: `docs/superpowers/specs/2026-09-05-toolcraft-design-port-design.md`. Behaviour spec: `docs/superpowers/specs/2026-09-05-skadis-board-planner-design.md`.

## Global Constraints

- Styling is StyleX only (`stylex.create` + `stylex.props`); tokens from `src/ui/tokens.stylex.ts` and `src/ui/mixes.stylex.ts`; light theme from `src/ui/themes.stylex.ts`. The only CSS files are `src/reset.css` and the `@fontsource-variable/inter` import in `src/main.tsx`. No inline `style=` props except where a value is computed per element (SVG geometry is attributes, not styles).
- Palette (dark / light): bg `oklch(0.145 0 0)` / `oklch(1 0 0)`; surface `oklch(0.205 0 0)` / `oklch(1 0 0)`; text `oklch(0.985 0 0)` / `oklch(0.145 0 0)`; muted `oklch(0.708 0 0)` / `oklch(0.556 0 0)`; mutedBg `#262626` / `#f8f8f8`; accent `#0c8ce9`; attention `#ea733a`; destructive `hsl(0 84% 60%)`; link `#70b0fa` / `#0c8ce9`; ring `oklch(0.556 0 0)` / `oklch(0.708 0 0)`.
- Derived mixes: border 12 %, borderHover 20 %, borderFocus 30 %, divider 8 %, inputBg 5 % of `text` over transparent; panelBg 75 % of `surface` over transparent; viz ladder as `text` over `surface`: grid 7 %, fillDim 14 %, fill 20 %, line 30 %, lineStrong 45 %, data 62 %.
- Type scale 11 / 12 / 13 / 15 / 20 px; radii 2 / 4 / 6 / 8 px; spacing 4 / 8 / 12 / 16 / 24 px; panel width 300 px, header row 36 px, section body padding 8 px top, 24 px bottom, 12 px sides; inputs 28 px tall.
- Accent is used only for: hovered board stroke, focus ring companion on the theme toggle active state (`mutedBg` background, `text` colour, no accent), and nothing else. Errors use `destructive`.
- Visible labels: `Width`, `Height`, `Unit`, `Model`, `Printer`, `Bed width`, `Bed depth`. Section titles: `Space`, `Board`, `Printer`, `Print list`. Panel title `Board planner`. Footer link text `Open files on MakerWorld`. Chip text keeps `N boards`, `left on the right`, `left at the bottom`.
- Theme storage key `appearance.theme.v1`; default preference `dark`.
- `npm test` (vitest run), `npm run typecheck` (tsc --noEmit), `npm run build` must pass at the end of every task; test output warning-free.
- Commit messages: plain sentences, no conventional-commit prefixes, no "Fix X:" colon subjects. End every commit message with a blank line and then `Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2`.
- Do not change anything under `src/solver`, `src/models`, `src/printers`, `src/units.ts`, or `src/ui/planState.ts`.

## File Structure

```
src/main.tsx                     + import '@fontsource-variable/inter'
src/reset.css                    scrollbars, #root clip, font smoothing
src/ui/tokens.stylex.ts          rewritten: colors (dark base), space, radius, font
src/ui/mixes.stylex.ts           NEW: derived color-mix vars (border, viz ladder…)
src/ui/themes.stylex.ts          NEW: lightTheme = createTheme(colors, …)
src/ui/useTheme.ts               NEW: preference, resolvedTheme, setPreference
src/ui/ThemeToggle.tsx           NEW: three-state segmented control
src/ui/Panel.tsx                 NEW: floating surface (header, body, footer)
src/ui/PanelSection.tsx          NEW: collapsible section
src/ui/fields.tsx                NEW: NumberField, SelectField, FieldRow
src/ui/InputPanel.tsx            rebuilt on sections + fields
src/ui/Canvas.tsx                NEW: dot-grid stage + chip + preview
src/ui/SummaryChip.tsx           NEW: replaces Summary.tsx (deleted)
src/ui/Preview.tsx               restyled
src/ui/PrintList.tsx             restyled, link removed (moves to footer)
src/ui/ErrorBoundary.tsx         restyled
src/ui/App.tsx                   theme wiring + Canvas/Panel layout
```

Tests next to code. Existing tests that must keep passing: `App.test.tsx` (labels), `Preview.test.tsx`, `PrintList.test.tsx` (minus the link), `planState.test.ts`, `ErrorBoundary.test.tsx`, solver tests.

---

### Task 1: Tokens, mixes, light theme, font, `useTheme`

**Files:**
- Modify: `src/ui/tokens.stylex.ts`, `src/reset.css`, `src/main.tsx`, `package.json` (dependency)
- Create: `src/ui/mixes.stylex.ts`, `src/ui/themes.stylex.ts`, `src/ui/useTheme.ts`
- Test: `src/ui/useTheme.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  ```ts
  // tokens.stylex.ts
  export const colors: { bg, surface, text, muted, mutedBg, accent, attention, destructive, link, ring }
  export const space: { xs:'4px', sm:'8px', md:'12px', lg:'16px', xl:'24px' }
  export const radius: { xs:'2px', sm:'4px', md:'6px', lg:'8px' }
  export const font: { xs:'11px', sm:'12px', md:'13px', lg:'15px', xl:'20px', family }
  // mixes.stylex.ts
  export const mixes: { border, borderHover, borderFocus, divider, inputBg, panelBg, vizGrid, vizFillDim, vizFill, vizLine, vizLineStrong, vizData }
  // themes.stylex.ts
  export const lightTheme: stylex theme for `colors`
  // useTheme.ts
  export type ThemePreference = 'dark' | 'light' | 'system'; export type ResolvedTheme = 'dark' | 'light';
  export const THEME_STORAGE_KEY = 'appearance.theme.v1';
  export function useTheme(): { preference: ThemePreference; resolvedTheme: ResolvedTheme; setPreference: (p: ThemePreference) => void };
  ```
  Existing components keep compiling because the old token names they use are replaced in later tasks; in this task, keep temporary aliases so nothing breaks (see Step 3).

- [ ] **Step 1: Install the font and write the failing `useTheme` test**

Run: `npm i @fontsource-variable/inter`

`src/ui/useTheme.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme, THEME_STORAGE_KEY } from './useTheme';

function mockMatchMedia(dark: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches: dark,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
  };
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn(() => mql) });
  return { fire: (matches: boolean) => listeners.forEach((fn) => fn({ matches })) };
}

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  it('defaults to dark with nothing stored', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('reads a stored preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('ignores an invalid stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    const { result } = renderHook(() => useTheme());
    expect(result.current.preference).toBe('dark');
  });

  it('follows the system preference and its changes', () => {
    const mq = mockMatchMedia(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'system');
    const { result } = renderHook(() => useTheme());
    expect(result.current.resolvedTheme).toBe('dark');
    act(() => mq.fire(false));
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('writes the preference to storage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setPreference('light'));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('keeps working when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setPreference('light'));
    expect(result.current.preference).toBe('light');
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/ui/useTheme.test.ts`
Expected: FAIL, cannot find module `./useTheme`.

- [ ] **Step 3: Write tokens, mixes, theme, hook, font import, reset**

`src/ui/tokens.stylex.ts` (replace the file):
```ts
import * as stylex from '@stylexjs/stylex';

/** Dark is the base theme. `themes.stylex.ts` overrides these for light. */
export const colors = stylex.defineVars({
  bg: 'oklch(0.145 0 0)',
  surface: 'oklch(0.205 0 0)',
  text: 'oklch(0.985 0 0)',
  muted: 'oklch(0.708 0 0)',
  mutedBg: '#262626',
  accent: '#0c8ce9',
  attention: '#ea733a',
  destructive: 'hsl(0 84% 60%)',
  link: '#70b0fa',
  ring: 'oklch(0.556 0 0)',
});

export const space = stylex.defineVars({
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
});

export const radius = stylex.defineVars({
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
});

export const font = stylex.defineVars({
  xs: '11px',
  sm: '12px',
  md: '13px',
  lg: '15px',
  xl: '20px',
  family: '"Inter Variable", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
});
```

`src/ui/mixes.stylex.ts`:
```ts
import * as stylex from '@stylexjs/stylex';
import { colors } from './tokens.stylex';

/**
 * Derived colours. They reference `colors` through var(), so they follow the
 * active theme as long as the theme class is applied to <html> (see App).
 */
export const mixes = stylex.defineVars({
  border: `color-mix(in oklab, ${colors.text} 12%, transparent)`,
  borderHover: `color-mix(in oklab, ${colors.text} 20%, transparent)`,
  borderFocus: `color-mix(in oklab, ${colors.text} 30%, transparent)`,
  divider: `color-mix(in oklab, ${colors.text} 8%, transparent)`,
  inputBg: `color-mix(in oklab, ${colors.text} 5%, transparent)`,
  panelBg: `color-mix(in oklab, ${colors.surface} 75%, transparent)`,
  vizGrid: `color-mix(in oklab, ${colors.text} 7%, ${colors.surface})`,
  vizFillDim: `color-mix(in oklab, ${colors.text} 14%, ${colors.surface})`,
  vizFill: `color-mix(in oklab, ${colors.text} 20%, ${colors.surface})`,
  vizLine: `color-mix(in oklab, ${colors.text} 30%, ${colors.surface})`,
  vizLineStrong: `color-mix(in oklab, ${colors.text} 45%, ${colors.surface})`,
  vizData: `color-mix(in oklab, ${colors.text} 62%, ${colors.surface})`,
});
```
If the StyleX compiler rejects a template literal that references `colors` inside `defineVars`, replace each reference with the literal `var(--…)` name is NOT possible (hashed), so instead move each mix inline into the `stylex.create` blocks that use it (template literals referencing `colors.text` are supported in `create`). Report which path you took.

`src/ui/themes.stylex.ts`:
```ts
import * as stylex from '@stylexjs/stylex';
import { colors } from './tokens.stylex';

export const lightTheme = stylex.createTheme(colors, {
  bg: 'oklch(1 0 0)',
  surface: 'oklch(1 0 0)',
  text: 'oklch(0.145 0 0)',
  muted: 'oklch(0.556 0 0)',
  mutedBg: '#f8f8f8',
  accent: '#0c8ce9',
  attention: '#ea733a',
  destructive: 'hsl(0 84% 60%)',
  link: '#0c8ce9',
  ring: 'oklch(0.708 0 0)',
});
```

`src/ui/useTheme.ts`:
```ts
import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'appearance.theme.v1';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isPreference(value: unknown): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

function readStored(): ThemePreference | null {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeStored(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage may be unavailable; the in-memory preference still applies.
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia(DARK_QUERY).matches;
}

export function useTheme(): {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStored() ?? 'dark');
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: { matches: boolean }) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStored(next);
  }, []);

  const resolvedTheme: ResolvedTheme =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  return { preference, resolvedTheme, setPreference };
}
```

`src/reset.css` (replace):
```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { margin: 0; height: 100%; min-height: 100%; }
#root { overflow: clip; }
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
input, select, button { font: inherit; }
* {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, currentColor 10%, transparent) transparent;
}
*::-webkit-scrollbar { width: 4px; height: 4px; }
*::-webkit-scrollbar-track, *::-webkit-scrollbar-corner { background: transparent; }
*::-webkit-scrollbar-thumb {
  min-height: 2.75rem;
  border-radius: 999px;
  background-color: color-mix(in oklab, currentColor 10%, transparent);
}
```

`src/main.tsx`: add `import '@fontsource-variable/inter';` as the first import, before `./reset.css`.

**Temporary compatibility:** the old token names `colors.border`, `colors.accentSoft`, `colors.danger`, `colors.dangerSoft`, `colors.boardFill`, `colors.boardStroke`, `colors.boardFillMirror`, `colors.leftover`, `font.sizeSm/sizeMd/sizeLg` are still referenced by `InputPanel`, `Summary`, `Preview`, `PrintList`, `ErrorBoundary`, `App`. Those files are rewritten in Tasks 2 to 4. To keep this task green, do a mechanical rename in those files now: `colors.border` → `mixes.border`, `colors.accentSoft` → `mixes.inputBg`, `colors.danger` → `colors.destructive`, `colors.dangerSoft` → `mixes.inputBg`, `colors.boardFill` → `mixes.vizFillDim`, `colors.boardFillMirror` → `mixes.vizFill`, `colors.boardStroke` → `mixes.vizLineStrong`, `colors.leftover` → `mixes.vizGrid`, `font.sizeSm` → `font.xs`, `font.sizeMd` → `font.sm`, `font.sizeLg` → `font.lg`, adding `import { mixes } from './mixes.stylex'` where needed. Do not restyle anything else in this task.

- [ ] **Step 4: Run tests, typecheck, build**

Run: `npm test && npm run build`
Expected: all previous tests plus 6 new pass; build emits CSS containing `Inter Variable`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Adopt the Toolcraft palette, Inter and a theme preference hook

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 2: Field primitives, collapsible sections, rebuilt input panel

**Files:**
- Create: `src/ui/fields.tsx`, `src/ui/PanelSection.tsx`
- Modify: `src/ui/InputPanel.tsx`, `src/ui/App.test.tsx` (label `Board model` → `Model`)
- Test: `src/ui/fields.test.tsx`, `src/ui/PanelSection.test.tsx`

**Interfaces:**
- Consumes: `colors`, `space`, `radius`, `font` from tokens; `mixes`.
- Produces:
  ```ts
  export function NumberField(props: { label: string; value: string; onChange: (value: string) => void }): JSX.Element;
  export function SelectField(props: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }): JSX.Element;
  export function FieldRow(props: { children: ReactNode }): JSX.Element;   // 50/50 row
  export function PanelSection(props: { title: string; defaultOpen?: boolean; children: ReactNode }): JSX.Element;
  ```
  `InputPanel` keeps `InputPanelProps { form, onChange }` and renders three `PanelSection`s: Space, Board, Printer.

- [ ] **Step 1: Write the failing tests**

`src/ui/fields.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberField, SelectField } from './fields';

describe('fields', () => {
  it('NumberField wires the label, step and change handler', () => {
    const onChange = vi.fn();
    render(<NumberField label="Width" value="10" onChange={onChange} />);
    const input = screen.getByLabelText('Width') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.getAttribute('step')).toBe('any');
    expect(input.value).toBe('10');
    fireEvent.change(input, { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith('12');
  });

  it('SelectField renders options and reports the chosen value', () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="Unit"
        value="mm"
        onChange={onChange}
        options={[
          { value: 'mm', label: 'mm' },
          { value: 'cm', label: 'cm' },
        ]}
      />,
    );
    const select = screen.getByLabelText('Unit') as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    fireEvent.change(select, { target: { value: 'cm' } });
    expect(onChange).toHaveBeenCalledWith('cm');
  });
});
```

`src/ui/PanelSection.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PanelSection } from './PanelSection';

describe('PanelSection', () => {
  it('renders open by default and collapses on click', () => {
    render(
      <PanelSection title="Space">
        <p>body</p>
      </PanelSection>,
    );
    const header = screen.getByRole('button', { name: 'Space' });
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('body')).toBeTruthy();
    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('body')).toBeNull();
    fireEvent.click(header);
    expect(screen.getByText('body')).toBeTruthy();
  });

  it('respects defaultOpen=false', () => {
    render(
      <PanelSection title="Printer" defaultOpen={false}>
        <p>body</p>
      </PanelSection>,
    );
    expect(screen.queryByText('body')).toBeNull();
  });
});
```

In `src/ui/App.test.tsx`, nothing queries `Board model` today, so no change is required there; keep the file as is.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/ui/fields.test.tsx src/ui/PanelSection.test.tsx`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement fields**

`src/ui/fields.tsx`:
```tsx
import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.xs,
    minWidth: 0,
  },
  label: {
    fontSize: font.xs,
    lineHeight: '14px',
    color: colors.muted,
    userSelect: 'none',
  },
  control: {
    height: '28px',
    width: '100%',
    minWidth: 0,
    paddingBlock: 0,
    paddingInline: space.sm,
    fontSize: font.sm,
    lineHeight: '1.625',
    color: colors.text,
    backgroundColor: mixes.inputBg,
    backgroundClip: 'padding-box',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: {
      default: mixes.border,
      ':hover': mixes.borderHover,
      ':focus': mixes.borderFocus,
    },
    borderRadius: radius.lg,
    outlineWidth: {
      default: 0,
      ':focus-visible': '2px',
    },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
    transitionProperty: 'border-color',
    transitionDuration: '120ms',
  },
  selectWrap: {
    position: 'relative',
  },
  select: {
    appearance: 'none',
    paddingInlineEnd: '28px',
    cursor: 'default',
  },
  chevron: {
    position: 'absolute',
    insetInlineEnd: space.sm,
    top: '50%',
    transform: 'translateY(-50%)',
    width: '12px',
    height: '12px',
    color: colors.muted,
    pointerEvents: 'none',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: space.sm,
  },
});

export function FieldRow({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.row)}>{children}</div>;
}

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label {...stylex.props(styles.field)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      <input
        {...stylex.props(styles.control)}
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label {...stylex.props(styles.field)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      <span {...stylex.props(styles.selectWrap)}>
        <select
          {...stylex.props(styles.control, styles.select)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg {...stylex.props(styles.chevron)} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      </span>
    </label>
  );
}
```

- [ ] **Step 4: Implement PanelSection**

`src/ui/PanelSection.tsx`:
```tsx
import { useId, useState, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  section: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.divider,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: '36px',
    paddingInlineStart: space.md,
    paddingInlineEnd: space.sm,
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: colors.text,
    fontSize: font.md,
    fontWeight: 500,
    textAlign: 'start',
    cursor: 'default',
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '-2px',
  },
  chevron: {
    width: '14px',
    height: '14px',
    color: colors.muted,
    transitionProperty: 'transform',
    transitionDuration: '150ms',
  },
  chevronClosed: {
    transform: 'rotate(-90deg)',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
    paddingTop: space.sm,
    paddingBottom: space.xl,
    paddingInline: space.md,
  },
});

export function PanelSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section {...stylex.props(styles.section)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        {...stylex.props(styles.header)}
      >
        <span>{title}</span>
        <svg
          {...stylex.props(styles.chevron, !open && styles.chevronClosed)}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      </button>
      {open && (
        <div id={bodyId} {...stylex.props(styles.body)}>
          {children}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Rebuild InputPanel on sections and fields**

`src/ui/InputPanel.tsx` (replace):
```tsx
import type { FormState } from './planState';
import { MODELS } from '../models';
import { PRINTERS, CUSTOM_PRINTER_ID } from '../printers';
import { UNITS, toMm, fromMm, type Unit } from '../units';
import { PanelSection } from './PanelSection';
import { FieldRow, NumberField, SelectField } from './fields';

export interface InputPanelProps {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
}

function convert(value: string, from: Unit, to: Unit): string {
  const n = Number(value);
  if (value.trim() === '' || !Number.isFinite(n)) return value;
  const converted = fromMm(toMm(n, from), to);
  return String(Math.round(converted * 100) / 100);
}

export function InputPanel({ form, onChange }: InputPanelProps) {
  const isCustom = form.printerId === CUSTOM_PRINTER_ID;

  const changeUnit = (unit: Unit) => {
    onChange({
      unit,
      width: convert(form.width, form.unit, unit),
      height: convert(form.height, form.unit, unit),
    });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <PanelSection title="Space">
        <FieldRow>
          <NumberField label="Width" value={form.width} onChange={(width) => onChange({ width })} />
          <NumberField label="Height" value={form.height} onChange={(height) => onChange({ height })} />
        </FieldRow>
        <SelectField
          label="Unit"
          value={form.unit}
          onChange={(u) => changeUnit(u as Unit)}
          options={UNITS.map((u) => ({ value: u, label: u }))}
        />
      </PanelSection>

      <PanelSection title="Board">
        <SelectField
          label="Model"
          value={form.modelId}
          onChange={(modelId) => onChange({ modelId })}
          options={MODELS.map((m) => ({ value: m.id, label: m.name }))}
        />
      </PanelSection>

      <PanelSection title="Printer">
        <SelectField
          label="Printer"
          value={form.printerId}
          onChange={(printerId) => onChange({ printerId })}
          options={[
            ...PRINTERS.map((p) => ({ value: p.id, label: p.name })),
            { value: CUSTOM_PRINTER_ID, label: 'Custom bed size' },
          ]}
        />
        {isCustom && (
          <FieldRow>
            <NumberField
              label="Bed width"
              value={form.customBedWidth}
              onChange={(customBedWidth) => onChange({ customBedWidth })}
            />
            <NumberField
              label="Bed depth"
              value={form.customBedDepth}
              onChange={(customBedDepth) => onChange({ customBedDepth })}
            />
          </FieldRow>
        )}
      </PanelSection>
    </form>
  );
}
```
Note: the `Printer` section title and the `Printer` select label are both "Printer"; `getByLabelText('Printer')` matches the select only (the section header is a button, not a label), so the existing App test keeps working.

- [ ] **Step 6: Run everything**

Run: `npm test && npm run build`
Expected: all pass. The page still uses the old card layout until Task 3.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add field primitives and collapsible sections and rebuild the input panel on them

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 3: Floating panel, theme toggle, canvas and summary chip

**Files:**
- Create: `src/ui/Panel.tsx`, `src/ui/ThemeToggle.tsx`, `src/ui/Canvas.tsx`, `src/ui/SummaryChip.tsx`
- Delete: `src/ui/Summary.tsx`
- Modify: `src/ui/App.tsx`, `src/ui/App.test.tsx`, `src/ui/PrintList.tsx` (remove the link paragraph only), `src/ui/PrintList.test.tsx` (drop the link assertion)
- Test: `src/ui/SummaryChip.test.tsx`, `src/ui/ThemeToggle.test.tsx`

**Interfaces:**
- Consumes: `useTheme`, `lightTheme`, `InputPanel`, `PanelSection`, `Preview`, `PrintList`, `computePlan`, tokens, mixes.
- Produces:
  ```ts
  export function Panel(props: { title: string; headerEnd?: ReactNode; footer?: ReactNode; children: ReactNode }): JSX.Element;
  export function ThemeToggle(props: { preference: ThemePreference; onChange: (p: ThemePreference) => void }): JSX.Element;
  export function Canvas(props: { plan: Plan | null; error: string | null }): JSX.Element;
  export function SummaryChip(props: { plan: Plan | null; error: string | null }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing tests**

`src/ui/SummaryChip.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SummaryChip } from './SummaryChip';
import { plan } from '../solver';
import { skadisInfinity } from '../models/skadisInfinity';
import { getPrinter } from '../printers';

const a1 = getPrinter('a1', { bedWidthMm: 0, bedDepthMm: 0 });

describe('SummaryChip', () => {
  it('shows count and coverage with no leftover text when leftover rounds to zero', () => {
    const p = plan({ widthMm: 1000.3, heightMm: 600, model: skadisInfinity, printer: a1 });
    render(<SummaryChip plan={p} error={null} />);
    const text = screen.getByTestId('summary').textContent ?? '';
    expect(text).toMatch(/15 boards/);
    expect(text).toMatch(/1000 × 600 mm/);
    expect(text).not.toMatch(/left/);
  });

  it('shows leftover on the right and at the bottom', () => {
    const p = plan({ widthMm: 1015, heightMm: 725, model: skadisInfinity, printer: a1 });
    render(<SummaryChip plan={p} error={null} />);
    const text = screen.getByTestId('summary').textContent ?? '';
    expect(text).toMatch(/15 mm left on the right/);
    expect(text).toMatch(/5 mm left at the bottom/);
  });

  it('renders the error as an alert and keeps the summary', () => {
    const p = plan({ widthMm: 1000, heightMm: 600, model: skadisInfinity, printer: a1 });
    render(<SummaryChip plan={p} error="Enter a width greater than zero." />);
    expect(screen.getByRole('alert').textContent).toMatch(/width/i);
    expect(screen.getByTestId('summary').textContent).toMatch(/15 boards/);
  });

  it('uses the singular for one board', () => {
    const p = plan({ widthMm: 200, heightMm: 200, model: skadisInfinity, printer: a1 });
    render(<SummaryChip plan={p} error={null} />);
    expect(screen.getByTestId('summary').textContent).toMatch(/^1 board ·/);
  });
});
```

`src/ui/ThemeToggle.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  it('marks the active preference and reports clicks', () => {
    const onChange = vi.fn();
    render(<ThemeToggle preference="dark" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Dark theme' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Light theme' }).getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: 'System theme' }));
    expect(onChange).toHaveBeenCalledWith('system');
  });
});
```

Add to `src/ui/App.test.tsx` (keep all existing tests):
```tsx
import { THEME_STORAGE_KEY } from './useTheme';
import { skadisInfinity } from '../models/skadisInfinity';
// ...
  it('links to the model files from the panel footer', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: /Open files on MakerWorld/ }) as HTMLAnchorElement;
    expect(link.href).toBe(skadisInfinity.url);
  });

  it('applies the light theme class to the document when light is chosen', () => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    render(<App />);
    const before = document.documentElement.className;
    fireEvent.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(document.documentElement.className).not.toBe(before);
    expect(document.documentElement.style.colorScheme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(document.documentElement.className).toBe(before);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
```
Also add `beforeEach(() => window.localStorage.clear())` at the top of the App describe so theme state does not leak between tests (import `beforeEach` from vitest). jsdom has no `matchMedia`; `useTheme` guards for that.

In `src/ui/PrintList.test.tsx`, delete the `getByRole('link', …)` lines from the third test and rename it to `'shows the mirror note'`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/ui/SummaryChip.test.tsx src/ui/ThemeToggle.test.tsx src/ui/App.test.tsx`
Expected: FAIL (modules missing, footer link missing).

- [ ] **Step 3: Implement ThemeToggle**

`src/ui/ThemeToggle.tsx`:
```tsx
import * as stylex from '@stylexjs/stylex';
import type { ThemePreference } from './useTheme';
import { colors, radius } from './tokens.stylex';

const styles = stylex.create({
  group: {
    display: 'inline-flex',
    gap: '2px',
    padding: '2px',
    borderRadius: radius.md,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: 'transparent', ':hover': colors.mutedBg },
    color: { default: colors.muted, ':hover': colors.text },
    cursor: 'default',
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '1px',
  },
  active: {
    backgroundColor: colors.mutedBg,
    color: colors.text,
  },
  icon: {
    width: '14px',
    height: '14px',
  },
});

const OPTIONS: { value: ThemePreference; label: string; path: string }[] = [
  { value: 'dark', label: 'Dark theme', path: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' },
  {
    value: 'light',
    label: 'Light theme',
    path: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  },
  { value: 'system', label: 'System theme', path: 'M3 5h18v11H3zM8 20h8M12 16v4' },
];

export function ThemeToggle({
  preference,
  onChange,
}: {
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
}) {
  return (
    <div {...stylex.props(styles.group)} role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-label={o.label}
          aria-pressed={preference === o.value}
          onClick={() => onChange(o.value)}
          {...stylex.props(styles.button, preference === o.value && styles.active)}
        >
          <svg {...stylex.props(styles.icon)} viewBox="0 0 24 24" aria-hidden="true">
            <path d={o.path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement Panel**

`src/ui/Panel.tsx`:
```tsx
import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const MOBILE = '@media (max-width: 800px)';

const styles = stylex.create({
  panel: {
    position: 'fixed',
    top: { default: '10px', [MOBILE]: 'auto' },
    right: { default: '10px', [MOBILE]: 0 },
    bottom: { default: 'auto', [MOBILE]: 0 },
    left: { default: 'auto', [MOBILE]: 0 },
    width: { default: '300px', [MOBILE]: 'auto' },
    maxHeight: { default: 'calc(100dvh - 20px)', [MOBILE]: '50dvh' },
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: { default: radius.lg, [MOBILE]: `${radius.lg} ${radius.lg} 0 0` },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    backgroundColor: mixes.panelBg,
    backdropFilter: 'blur(40px) saturate(150%)',
    color: colors.text,
    fontFamily: font.family,
    isolation: 'isolate',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '36px',
    flexShrink: 0,
    paddingInlineStart: space.md,
    paddingInlineEnd: space.xs,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.divider,
  },
  title: {
    margin: 0,
    fontSize: font.md,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  body: {
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
  },
  footer: {
    flexShrink: 0,
    padding: space.md,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: mixes.divider,
  },
});

export function Panel({
  title,
  headerEnd,
  footer,
  children,
}: {
  title: string;
  headerEnd?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside {...stylex.props(styles.panel)} aria-label={title}>
      <header {...stylex.props(styles.header)}>
        <h1 {...stylex.props(styles.title)}>{title}</h1>
        {headerEnd}
      </header>
      <div {...stylex.props(styles.body)}>{children}</div>
      {footer && <footer {...stylex.props(styles.footer)}>{footer}</footer>}
    </aside>
  );
}
```

- [ ] **Step 5: Implement SummaryChip and Canvas**

`src/ui/SummaryChip.tsx`:
```tsx
import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space.xs,
    pointerEvents: 'none',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: space.sm,
    height: '28px',
    paddingInline: space.md,
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: font.sm,
    whiteSpace: 'nowrap',
  },
  count: {
    fontWeight: 600,
  },
  detail: {
    color: colors.muted,
  },
  error: {
    color: colors.destructive,
  },
});

const mm = (n: number) => `${Math.round(n)}`;

export function SummaryChip({ plan, error }: { plan: Plan | null; error: string | null }) {
  const parts: string[] = [];
  if (plan) {
    parts.push(`${mm(plan.coveredWidthMm)} × ${mm(plan.coveredHeightMm)} mm`);
    if (Math.round(plan.leftoverWidthMm) > 0) parts.push(`${mm(plan.leftoverWidthMm)} mm left on the right`);
    if (Math.round(plan.leftoverHeightMm) > 0) parts.push(`${mm(plan.leftoverHeightMm)} mm left at the bottom`);
  }
  return (
    <div {...stylex.props(styles.wrap)}>
      {plan && (
        <div {...stylex.props(styles.chip)} data-testid="summary">
          <span {...stylex.props(styles.count)}>
            {plan.boards.length} {plan.boards.length === 1 ? 'board' : 'boards'}
          </span>
          <span {...stylex.props(styles.detail)}>{' · ' + parts.join(' · ')}</span>
        </div>
      )}
      {error && (
        <div role="alert" {...stylex.props(styles.chip, styles.error)}>
          {error}
        </div>
      )}
    </div>
  );
}
```

`src/ui/Canvas.tsx`:
```tsx
import * as stylex from '@stylexjs/stylex';
import type { Plan } from '../solver';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';
import { Preview } from './Preview';
import { SummaryChip } from './SummaryChip';

const MOBILE = '@media (max-width: 800px)';

const styles = stylex.create({
  canvas: {
    position: 'fixed',
    inset: 0,
    backgroundColor: colors.bg,
    backgroundImage: `radial-gradient(${mixes.vizGrid} 1px, transparent 1px)`,
    backgroundSize: '16px 16px',
    overflow: 'hidden',
  },
  chip: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 1,
  },
  stage: {
    position: 'absolute',
    top: '56px',
    left: '24px',
    right: { default: '334px', [MOBILE]: '24px' },
    bottom: { default: '24px', [MOBILE]: 'calc(50dvh + 16px)' },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function Canvas({ plan, error }: { plan: Plan | null; error: string | null }) {
  return (
    <div {...stylex.props(styles.canvas)}>
      <div {...stylex.props(styles.chip)}>
        <SummaryChip plan={plan} error={error} />
      </div>
      <div {...stylex.props(styles.stage)}>
        <Preview plan={plan} />
      </div>
    </div>
  );
}
```
`Preview` is restyled in Task 4; in this task it still renders its card, which is acceptable for the intermediate commit as long as it fits the stage (it uses `width: 100%`).

- [ ] **Step 6: Rewire App**

`src/ui/App.tsx` (replace):
```tsx
import { useEffect, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { InputPanel } from './InputPanel';
import { Panel } from './Panel';
import { PanelSection } from './PanelSection';
import { ThemeToggle } from './ThemeToggle';
import { Canvas } from './Canvas';
import { PrintList } from './PrintList';
import { computePlan, DEFAULT_FORM, type FormState, type PlanOutcome } from './planState';
import { getModel } from '../models';
import type { Plan } from '../solver';
import { useTheme } from './useTheme';
import { lightTheme } from './themes.stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  app: {
    fontFamily: font.family,
    color: colors.text,
  },
  footerLink: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '28px',
    borderRadius: radius.lg,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: mixes.border, ':hover': mixes.borderHover },
    backgroundColor: { default: mixes.inputBg, ':hover': colors.mutedBg },
    color: colors.text,
    fontSize: font.sm,
    fontWeight: 500,
    textDecoration: 'none',
    paddingInline: space.md,
    outlineWidth: { default: 0, ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
  },
});

interface AppState {
  form: FormState;
  outcome: PlanOutcome;
  lastPlan: Plan | null;
}

function stateFor(form: FormState, lastPlan: Plan | null): AppState {
  const outcome = computePlan(form);
  return { form, outcome, lastPlan: outcome.plan ?? lastPlan };
}

const lightThemeClasses = (stylex.props(lightTheme).className ?? '').split(' ').filter(Boolean);

export default function App() {
  const [state, setState] = useState<AppState>(() => stateFor(DEFAULT_FORM, null));
  const { preference, resolvedTheme, setPreference } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'light') root.classList.add(...lightThemeClasses);
    else root.classList.remove(...lightThemeClasses);
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const onChange = (patch: Partial<FormState>) =>
    setState((s) => stateFor({ ...s.form, ...patch }, s.lastPlan));

  const model = getModel(state.form.modelId);

  return (
    <div {...stylex.props(styles.app)}>
      <Canvas plan={state.lastPlan} error={state.outcome.error} />
      <Panel
        title="Board planner"
        headerEnd={<ThemeToggle preference={preference} onChange={setPreference} />}
        footer={
          <a {...stylex.props(styles.footerLink)} href={model.url} target="_blank" rel="noopener noreferrer">
            Open files on MakerWorld
          </a>
        }
      >
        <InputPanel form={state.form} onChange={onChange} />
        <PanelSection title="Print list">
          <PrintList plan={state.lastPlan} model={model} />
        </PanelSection>
      </Panel>
    </div>
  );
}
```
Keep the existing `stateFor`/`AppState` code if it already matches; the important parts are the theme effect, `Canvas`, `Panel`, and the footer link. The `h1` "Board planner" now lives in `Panel`, so the existing heading test still passes.

Delete `src/ui/Summary.tsx`. In `src/ui/PrintList.tsx` delete the "Files:" paragraph and its `link` style; keep the note paragraph.

- [ ] **Step 7: Run everything**

Run: `npm test && npm run build`
Expected: all pass, including the two new App tests. If `stylex.props(lightTheme).className` is empty in tests (the compiler still transforms test files through the Vite plugin, so it should not be), report it rather than weakening the test.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Move the controls into a floating panel over a full-viewport canvas with a theme toggle

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 4: Restyle the preview, print list and error boundary

**Files:**
- Modify: `src/ui/Preview.tsx`, `src/ui/Preview.test.tsx`, `src/ui/PrintList.tsx`, `src/ui/ErrorBoundary.tsx`

**Interfaces:** unchanged (`Preview({ plan })`, `PrintList({ plan, model })`, `ErrorBoundary`).

- [ ] **Step 1: Extend the Preview tests (failing first)**

Add to `src/ui/Preview.test.tsx`:
```tsx
  it('draws the wall outline and omits labels on boards under 60 mm', () => {
    // 260 x 60 on a mini: columns [6, 5] (140 + 120 mm), one row of 2 holes (60 mm).
    const p = plan({ widthMm: 260, heightMm: 60, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} />);
    expect(container.querySelector('[data-outline]')).not.toBeNull();
    expect(container.querySelectorAll('[data-board] text')).toHaveLength(0);
  });

  it('keeps labels on boards of 60 mm or more', () => {
    const p = plan({ widthMm: 80, heightMm: 80, model: skadisInfinity, printer: mini });
    const { container } = render(<Preview plan={p} />);
    expect(container.querySelectorAll('[data-board] text').length).toBeGreaterThan(0);
  });
```
Run: `npm test -- src/ui/Preview.test.tsx` → the new tests FAIL.

- [ ] **Step 2: Restyle Preview**

`src/ui/Preview.tsx` (replace):
```tsx
import { useId } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Plan, PlacedBoard } from '../solver';
import { colors } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const MIN_LABEL_MM = 60;

const styles = stylex.create({
  svg: {
    display: 'block',
    width: '100%',
    height: '100%',
    overflow: 'visible',
  },
  board: {
    fill: mixes.vizFillDim,
    stroke: { default: colors.surface, ':hover': colors.accent },
    strokeWidth: 2,
    transitionProperty: 'stroke',
    transitionDuration: '100ms',
  },
  boardMirrored: {
    fill: mixes.vizFill,
  },
  value: {
    fill: colors.text,
    fontWeight: 600,
    pointerEvents: 'none',
  },
  detail: {
    fill: colors.muted,
    pointerEvents: 'none',
  },
  outline: {
    fill: 'none',
    stroke: mixes.vizLine,
    strokeWidth: 1,
  },
  hatch: {
    stroke: mixes.vizGrid,
  },
});

function Board({ b }: { b: PlacedBoard }) {
  const mirror = b.mirrorX && b.mirrorY ? 'xy' : b.mirrorX ? 'x' : b.mirrorY ? 'y' : undefined;
  const mirrorLabel =
    mirror === 'xy' ? 'mirror X+Y' : mirror === 'x' ? 'mirror X' : mirror === 'y' ? 'mirror Y' : null;
  const showLabels = Math.min(b.widthMm, b.heightMm) >= MIN_LABEL_MM;
  const fontSize = Math.min(b.widthMm, b.heightMm) * 0.14;
  const cx = b.xMm + b.widthMm / 2;
  const cy = b.yMm + b.heightMm / 2;
  return (
    <g data-board data-mirror={mirror}>
      <rect
        {...stylex.props(styles.board, mirror !== undefined && styles.boardMirrored)}
        x={b.xMm}
        y={b.yMm}
        width={b.widthMm}
        height={b.heightMm}
        vectorEffect="non-scaling-stroke"
      />
      {showLabels && (
        <>
          <text {...stylex.props(styles.value)} x={cx} y={cy - fontSize * 0.2} fontSize={fontSize} textAnchor="middle">
            {b.cols}×{b.rows}
          </text>
          <text {...stylex.props(styles.detail)} x={cx} y={cy + fontSize * 0.9} fontSize={fontSize * 0.7} textAnchor="middle">
            {b.widthMm}×{b.heightMm} mm
          </text>
          {mirrorLabel && (
            <text {...stylex.props(styles.detail)} x={cx} y={cy + fontSize * 1.8} fontSize={fontSize * 0.6} textAnchor="middle">
              {mirrorLabel}
            </text>
          )}
        </>
      )}
    </g>
  );
}

export function Preview({ plan }: { plan: Plan | null }) {
  const hatchId = useId();
  if (!plan) return null;
  const totalW = plan.coveredWidthMm + plan.leftoverWidthMm;
  const totalH = plan.coveredHeightMm + plan.leftoverHeightMm;
  return (
    <svg
      {...stylex.props(styles.svg)}
      viewBox={`0 0 ${totalW} ${totalH}`}
      role="img"
      aria-label="Board layout preview"
    >
      <defs>
        <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line {...stylex.props(styles.hatch)} x1="4" y1="0" x2="4" y2="8" strokeWidth="3" />
        </pattern>
      </defs>
      {plan.leftoverWidthMm > 0 && (
        <rect data-leftover x={plan.coveredWidthMm} y={0} width={plan.leftoverWidthMm} height={totalH} fill={`url(#${hatchId})`} />
      )}
      {plan.leftoverHeightMm > 0 && (
        <rect data-leftover x={0} y={plan.coveredHeightMm} width={plan.coveredWidthMm} height={plan.leftoverHeightMm} fill={`url(#${hatchId})`} />
      )}
      {plan.boards.map((b) => (
        <Board key={`${b.col}-${b.row}`} b={b} />
      ))}
      <rect data-outline {...stylex.props(styles.outline)} x={0} y={0} width={totalW} height={totalH} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
```
The existing Preview tests query `[data-board]`, `[data-leftover]`, `[data-mirror="x"]`, the `viewBox`, and the `8×8` label; all still hold (180 mm boards are above the label threshold). The `svg` element must be the root returned (no wrapper div), because `Canvas` sizes it.

- [ ] **Step 3: Restyle PrintList**

Replace the `styles` block in `src/ui/PrintList.tsx` with:
```tsx
const styles = stylex.create({
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: font.sm,
  },
  th: {
    textAlign: 'start',
    fontWeight: 500,
    fontSize: font.xs,
    color: colors.muted,
    paddingBlock: space.xs,
    paddingInline: 0,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.divider,
  },
  thEnd: {
    textAlign: 'end',
  },
  td: {
    paddingBlock: space.sm,
    paddingInline: 0,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.divider,
    whiteSpace: 'nowrap',
  },
  count: {
    textAlign: 'end',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  mirror: {
    display: 'inline-block',
    fontSize: font.xs,
    lineHeight: '16px',
    color: colors.text,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.borderHover,
    borderRadius: radius.sm,
    paddingInline: '6px',
  },
  note: {
    fontSize: font.xs,
    color: colors.muted,
    margin: 0,
    lineHeight: 1.5,
  },
});
```
and update the JSX: remove the outer card `<section>` and the `<h2>` (the section header comes from `PanelSection`), return a fragment `<>…</>` containing the table and the note; add `scope="col"` to each `<th>`; give the `Qty` header `{...stylex.props(styles.th, styles.thEnd)}`; imports become `{ colors, font, radius, space }` from tokens and `{ mixes }` from mixes. Keep `data`/test-facing text identical (`180 × 180 mm`, `8 × 8`, quantities, `—`, `Mirror X`…).

- [ ] **Step 4: Restyle ErrorBoundary**

In `src/ui/ErrorBoundary.tsx`, replace the styles with a centred layout on `colors.bg`: full-viewport flex container, a `colors.surface` card with `mixes.border` border and `radius.lg`, message at `font.md`, a `Reload` button styled like the footer link in App (28 px, `mixes.inputBg`, `mixes.border`). Keep the text `Something went wrong.` and the `Reload` button label so `ErrorBoundary.test.tsx` passes unchanged.

- [ ] **Step 5: Run everything**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Restyle the preview, print list and error boundary with the Toolcraft geometry ladder

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```

---

### Task 5: Visual check in both themes and README update

**Files:**
- Modify: `README.md`; any `src/ui/*.tsx` only for visual breakage found

- [ ] **Step 1: Screenshot check**

Start the dev server on a free port. Using Playwright with the cached Chromium (`~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, installed into a scratch folder outside the repo, never into `package.json`), capture:
1. `dark-1280.png`: defaults at 1280×900.
2. `light-1280.png`: after clicking the `Light theme` button.
3. `dark-mini.png`: printer A1 mini, 720×360, dark.
4. `dark-error.png`: width cleared (chip shows the alert, preview stays).
5. `dark-600.png`: viewport 600×900, full page (panel docked at the bottom, canvas above, no horizontal scroll: assert `document.documentElement.scrollWidth <= clientWidth`).

Also read computed styles and assert: panel `background-color` is not fully transparent; a board `rect` computed `fill` is an `rgb(...)`/`color(...)` value (not `none`); in light mode `document.documentElement.style.colorScheme === 'light'` and the canvas background computes to white.

Open each screenshot and check: text legible at 11 to 13 px, nothing clipped in the panel, chip readable over the dot grid, board labels legible, hover state visible (hover a board before one capture), the light theme has no leftover dark surfaces.

Fix real breakage only, in `src/ui/*.tsx`, with StyleX.

- [ ] **Step 2: README**

Under "## Layout" in `README.md`, add:
```markdown
- The UI follows Toolcraft's design direction (https://toolcraft.sh): a dark
  canvas-first workspace, a floating controls panel, Inter, and a neutral
  geometry ladder for the preview. Tokens live in `src/ui/tokens.stylex.ts`
  and `src/ui/mixes.stylex.ts`; the light theme in `src/ui/themes.stylex.ts`.
  Theme preference is stored under `appearance.theme.v1`.
```

- [ ] **Step 3: Verify and commit**

Run: `npm test && npm run build`

```bash
git add -A
git commit -m "Document the Toolcraft design direction after a visual check in both themes

Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2"
```
