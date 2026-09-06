# Condensed copy and UX tidy — design

Date: 2026-09-06
Status: approved for planning (Vanessa: "condense the text, improve the general UX, don't ask questions")

## Goal

The panel reads as too much text. Cut every user-facing sentence to the
minimum that still informs, remove redundant lines, and tidy the defaults.
No behaviour change.

## Copy (exact strings)

**Panel header**: title `Skadis Planner` only; the subtitle paragraph is removed.

**Strategy descriptions** (`src/solver/strategies.ts`):
- Balanced: `Fewest boards, sizes kept even.`
- Largest boards first: `Biggest boards, one small remainder.`
- Same size only: `Every board the same size; a small strip may stay open.`
- No mirroring: `Symmetric boards only, nothing to mirror.`
- Allow a gap: `Fewest boards, leaving up to the gap open.`

**Mounting descriptions** (`src/mounting/systems.ts`):
- Wall mounts: `One printed mount wherever corners meet.`
- Screw spacers: `A spacer and screw at each board corner.`
- Threaded connectors: `Connectors along every seam. Counts assumed.`

**Hardware items**: `HardwareItem` gains optional `link?: string` (a model
page for that item). Notes are dropped except where they change what to
buy:
- Wall mounts: `Single wall mount` gets `link: https://makerworld.com/en/models/420877`, no note.
- Spacers: `Wall plug` keeps no note.
- Threaded: `Connector screw` no note; `Spacer and M4 wall screw` renamed `Wall fixing (spacer + M4 screw)`, no note.
In the panel a linked item name renders as a link (new tab). In the TXT a
linked item prints ` (model: <url>)`; notes, when present, still print in
parentheses.

**Assumed counts**: the sentence under the Hardware table goes. The table
caption becomes `Hardware` followed by a small outlined badge `assumed`
when the system is assumed. The TXT keeps its one line
`Hardware counts are assumed; check the model page.`

**Mirror note** (`skadisInfinity.mirrorNote`):
`Even-hole boards print as a mirror image so the slots line up. Bambu Studio: right-click, Mirror, then X or Y.`

**Credit**: `author.thanks` becomes `Thank you!`; the footer reads
`Boards by AU3D. Thank you!` with the name linked. TXT footer:
`Boards by AU3D - <url>` then `Thank you!`.

**Chip**: the strategy name is appended only when the strategy is not
Balanced.

## UX tidy

- `Board` section collapsed by default (one model today).
- Everything else unchanged: sections, labels, buttons, download.

## Testing

Update the assertions that pin the old strings (App hint text, credit,
PrintList note/assumed line, printListText expectations, SummaryChip
`· Balanced`, hardware item names). Add: chip has no strategy suffix for
Balanced and has ` · Allow a gap` for allow-gap; the Single wall mount row
renders a link with the 420877 href; the assumed badge exists only for the
threaded system. Screenshot of the panel for the default and the threaded
system.
