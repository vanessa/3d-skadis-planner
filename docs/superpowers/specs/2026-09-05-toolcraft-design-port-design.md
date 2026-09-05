# Toolcraft design port — design

Date: 2026-09-05
Status: approved for planning
Builds on: `2026-09-05-skadis-board-planner-design.md` (behaviour is unchanged)

## Goal

Restyle the board planner to follow the design direction of
[Toolcraft](https://toolcraft.sh) (Pixel Point's starter kit for creative
tools): a dark, canvas-first workspace with a floating controls panel,
Inter, dense 11 to 13 px type, quiet neutral geometry, and one accent that
is reserved for interaction states. Behaviour, solver and tests stay as they
are; only the presentation layer changes.

Sources studied in the `pixel-point/toolcraft` repository (`starter/`):
`src/styles.css` (theme variables, type scale, radii, scrollbars),
`src/toolcraft/runtime/styles.css` (light and dark palettes, the
`--toolcraft-custom-viz-*` ladder), `docs/toolcraft/custom-control-visuals.md`
(how product geometry uses the ladder), `docs/toolcraft/core/layout.md`
(section, divider, label and inline-row rules),
`src/toolcraft/ui/lib/input-control-style.ts` and `panel/*.tsx` (control and
panel geometry).

## Decisions

| Topic | Decision |
|---|---|
| Theme | Dark by default. Preference `dark`, `light` or `system`, toggled from the panel header, stored in `localStorage` under `appearance.theme.v1`. |
| Font | Inter Variable via `@fontsource-variable/inter`, falling back to `system-ui`. |
| Type scale | 11 / 12 / 13 / 15 / 20 px. Section titles 13 px medium. Labels 11 px muted. Values 12 px. |
| Radii | 2 / 4 / 6 / 8 px. Panel and inputs 8 px. |
| Layout | The preview is the canvas and fills the viewport. Controls live in a floating 300 px panel at the top right. Below 800 px the panel docks to the bottom as a sheet. |
| Colour use | Neutral by default. The accent (`#0c8ce9`) appears only for a hovered board, the focus ring and the active theme choice. Errors use the destructive red. |
| Not ported | Toolcraft's runtime, Tailwind, schema controls, export, persistence of values, pan and zoom. StyleX stays. |

## Tokens (`src/ui/tokens.stylex.ts`)

Base values are the dark theme; `src/ui/themes.stylex.ts` exports
`lightTheme = stylex.createTheme(colors, {...})`, applied to the app root
when the resolved theme is light. Values are Toolcraft's own.

| Token | Dark | Light |
|---|---|---|
| `bg` (canvas) | `oklch(0.145 0 0)` | `oklch(1 0 0)` |
| `surface` (panel, popover) | `oklch(0.205 0 0)` | `oklch(1 0 0)` |
| `text` | `oklch(0.985 0 0)` | `oklch(0.145 0 0)` |
| `muted` | `oklch(0.708 0 0)` | `oklch(0.556 0 0)` |
| `mutedBg` | `#262626` | `#f8f8f8` |
| `accent` | `#0c8ce9` | `#0c8ce9` |
| `attention` | `#ea733a` | `#ea733a` |
| `destructive` | `hsl(0 84% 60%)` | `hsl(0 84% 60%)` |
| `link` | `#70b0fa` | `#0c8ce9` |
| `ring` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` |

Derived tokens are `color-mix()` strings so they follow the theme:
`border = color-mix(in oklab, text 12%, transparent)`, `borderHover` 20%,
`borderFocus` 30%, `divider` 8%, `inputBg = color-mix(in oklab, text 5%, transparent)`,
`panelBg = color-mix(in oklab, surface 75%, transparent)` (with backdrop blur).

Preview geometry ladder (Toolcraft's `--toolcraft-custom-viz-*`), all mixes
of `text` over `surface`: `vizGrid` 7%, `vizFillDim` 14%, `vizFill` 20%,
`vizLine` 30%, `vizLineStrong` 45%, `vizData` 62%, `vizInk = text`.

Spacing stays `xs 4, sm 8, md 12, lg 16, xl 24`. Panel width 300 px, header
row 36 px, section body padding 8 px top, 24 px bottom, 12 px sides.

## Layout and components

```
src/ui/
  tokens.stylex.ts     rewritten tokens (above)
  themes.stylex.ts     lightTheme
  useTheme.ts          preference state, storage, matchMedia, resolved theme
  ThemeToggle.tsx      three-state segmented control in the panel header
  Panel.tsx            floating surface: header (title + toggle), scrollable body, sticky footer
  PanelSection.tsx     collapsible section with a 36 px header row and chevron
  fields.tsx           NumberField, SelectField (label above control, shared styles)
  InputPanel.tsx       sections Space / Board / Printer built from fields
  Canvas.tsx           full-viewport dot-grid area holding the preview and the summary chip
  SummaryChip.tsx      replaces Summary.tsx: board count, coverage, leftover; error variant
  Preview.tsx          restyled with the viz ladder
  PrintList.tsx        compact table inside a Print list section; footer link button
  App.tsx              theme root, Canvas + Panel
  ErrorBoundary.tsx    restyled with tokens
```

**Panel.** Fixed at top 10 px, right 10 px, width 300 px, max height
`calc(100dvh - 20px)`, radius 8, `panelBg` with `backdrop-filter: blur(40px) saturate(150%)`,
1 px `border`. Header row 36 px: title "Board planner" at 13 px medium and
the theme toggle. Body scrolls with 4 px scrollbars. Footer is sticky with a
1 px `divider` on top and one secondary button linking to the model page
("Open files on MakerWorld", opens a new tab). Below 800 px: fixed at the
bottom, full width, left and right 0, radius on the top corners only, max
height 50dvh; the canvas takes the space above it.

**Sections.** `Space` (width and height in a 50/50 row, unit select),
`Board` (model select), `Printer` (printer select, then bed width and depth
in a 50/50 row when Custom is chosen), `Print list` (the table). All open by
default; collapse state is local and not persisted. Sections are separated
by a full-width 1 px `divider`. Section body: 8 px top, 24 px bottom, 12 px
sides. Labels never repeat the section noun: "Width", "Height", "Unit",
"Model", "Printer", "Bed width", "Bed depth". Test label queries for
`Width`, `Height`, `Unit`, `Printer`, `Bed width`, `Bed depth` stay valid;
"Board model" becomes "Model" and its test is updated.

**Fields.** Inputs and selects are 28 px tall, 12 px text, radius 8,
`inputBg` background, 1 px `border` (hover `borderHover`, focus `borderFocus`),
2 px `ring` outline with 2 px offset on `:focus-visible`, `step="any"` on
number inputs. Labels 11 px `muted`, 4 px above the control.

**Theme toggle.** A segmented control with three icon buttons (dark, light,
system) at 24 px, the active one with `mutedBg` background and `text`
colour, `aria-pressed` on the active one, `aria-label` on each. `useTheme`
resolves `system` through `matchMedia('(prefers-color-scheme: dark)')` and
listens for changes. The resolved theme sets `color-scheme` on the root
element so native controls match.

**Canvas.** Fills the viewport under the panel: `bg` colour with a dot grid
(`radial-gradient` dots of `vizGrid`, 16 px spacing). On desktop the preview
is centred in the area left of the panel (right padding 320 px); on mobile
it is centred above the sheet. The SVG keeps its mm `viewBox` and fills the
available box with the default `xMidYMid meet`, so the rectangle changes
shape as the inputs change and always fits. The summary chip sits at the
top left, 10 px inset: a small `surface` pill with 1 px `border` reading
`15 boards · 1000 × 600 mm` plus `· 15 mm left on the right` when there is
leftover. When the form is invalid the chip shows the error text in
`destructive` with `role="alert"` and the last valid preview stays.

**Preview geometry** (Toolcraft's area and part rules):
- Boards: `vizFillDim` fill; mirrored boards `vizFill`. No painted border;
  a 2 px non-scaling stroke in `surface` is the gap that separates boards.
- Hover: stroke switches to `accent`, 2 px non-scaling. This is the only
  accent use on the canvas.
- Labels: hole count in `text` at 13 px equivalent (scaled to the board),
  mm size in `muted` one step smaller. A mirrored board shows `mirror X`,
  `mirror Y` or `mirror X+Y` in `muted` under the size. Labels shrink with
  the board and are omitted when the board's shorter side is under 80 mm (a 2-hole, 60 mm board).
- Leftover strips: hatched with `vizGrid` lines on `bg`.
- The wall outline: 1 px non-scaling `vizLine` rectangle around the full
  space (covered + leftover) so the target size reads even when leftover is
  zero.

**Print list.** A compact table in the `Print list` section: columns Size,
Holes, Qty, Mirror; 12 px text; header cells 11 px `muted` with
`scope="col"`; row dividers 1 px `divider`; quantity right-aligned with
tabular numerals; mirror rendered as an outlined 11 px badge. The model's
mirror note follows at 11 px `muted`. The link moves to the panel footer.

**Error boundary.** Same behaviour, restyled: centred `surface` card on
`bg`, "Something went wrong." at 13 px, a secondary "Reload" button.

**Global.** `src/reset.css` gains thin 4 px transparent-track scrollbars,
`#root { height: 100%; overflow: clip }`, and `-webkit-font-smoothing`.
`src/main.tsx` imports `@fontsource-variable/inter` (the one CSS import from
a package, allowed by this spec) before `reset.css`.

## Data flow

Unchanged. `App` still owns `{ form, outcome, lastPlan }`; `useTheme` adds a
`preference` and `resolvedTheme` pair held in `App` and passed to `Panel`
(for the toggle) and applied to the root element via `lightTheme` when
resolved light. `Canvas` receives `plan` and `error`; `Panel` receives
`form`, `onChange`, `plan`, `model`, and the theme props.

## Error handling

Unchanged. Validation messages appear in the summary chip; solver errors
propagate the same way; the error boundary wraps the app.

## Testing

Vitest, `npm test`.
- `useTheme`: defaults to dark with no storage; reads a stored preference;
  `system` follows a mocked `matchMedia`; setting a preference writes
  storage; storage failures are ignored.
- `PanelSection`: renders open with `aria-expanded="true"`, hides content and
  flips the attribute on click, toggles with keyboard.
- `fields`: `NumberField` and `SelectField` wire label to control (query by
  label), pass `step="any"`.
- `SummaryChip`: count line, leftover fragments only when rounded > 0,
  error variant has `role="alert"`.
- Existing `App`, `Preview`, `PrintList`, `planState`, `ErrorBoundary`
  tests keep passing; the "Board model" label query becomes "Model", the
  link assertion moves to the footer (`Open files on MakerWorld`), and
  `Summary.test` expectations move to `SummaryChip`.
- Final visual check with headless Chromium screenshots: dark and light at
  1280 px, dark at 600 px, plus computed-style checks that the panel
  background and board fill resolve to non-transparent colours.

## Out of scope

Pan and zoom, keyboard shortcuts, persisting form values, collapsing state
persistence, a design-token export, any change to the solver or plan
shapes.
