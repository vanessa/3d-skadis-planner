# Form persistence and reset — design

Date: 2026-09-06
Status: approved for planning
Builds on: `2026-09-06-mounting-and-rename-design.md`

## Goal

Remember the form across reloads and let the user get back to the
shipped defaults in one click.

## Storage (`src/ui/formStorage.ts`)

Key `planner.form.v1`. `readStoredForm()` parses under try/catch, starts
from `DEFAULT_FORM`, and copies only known keys whose stored value is a
string, further checked against the live registries: `unit` against
`UNITS`, `strategyId` against `STRATEGIES`, `modelId`/`printerId`/`mountId`
against `MODELS`/`PRINTERS` (or `custom`)/`MOUNT_SYSTEMS`. An unknown id
(e.g. a stored `threaded-connectors`) falls back to the default for that
field rather than failing the whole read. Returns `null` when nothing in
the stored object was valid, when JSON parsing fails, or when
`localStorage` itself throws. `writeStoredForm`/`clearStoredForm` wrap
their call in try/catch and ignore failures.

## Wiring (`App.tsx`)

Initial state reads `readStoredForm() ?? DEFAULT_FORM`. A `useEffect` on
`state.form` writes the form on every change, except it clears the key
instead when the form equals `DEFAULT_FORM` exactly — so returning to the
defaults (by hand or via reset) leaves no stale entry behind.

## Reset button

`ResetButton` (`src/ui/ResetButton.tsx`) matches `ThemeToggle`'s 24 px
icon-button style, with a counter-clockwise arrow glyph,
`aria-label`/`title` "Reset to defaults". Placed left of `ThemeToggle` in
the panel header. Disabled when `state.form` equals `DEFAULT_FORM`
(key-by-key comparison). Click calls `clearStoredForm()`,
`setHighlight(null)`, `setState(stateFor(DEFAULT_FORM, null))`.

## Testing

`formStorage.test.ts`: round trip; invalid JSON → null; a removed mount id
falls back to the default; a non-string value is ignored; storage
throwing returns null without throwing. `App.test.tsx`: typing a new width
writes the key; a pre-seeded stored form renders that plan; Reset restores
the default plan, clears the key, and is disabled again afterwards.
