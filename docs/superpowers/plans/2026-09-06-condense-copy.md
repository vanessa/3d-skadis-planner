# Condensed Copy and UX Tidy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut the panel's text to the minimum and tidy defaults, with no behaviour change.

**Architecture:** Copy lives in data (`strategies.ts`, `systems.ts`, `skadisInfinity.ts`); the UI gains a `link` on hardware items, an `assumed` badge, a collapsed Board section, and loses the subtitle and the assumed sentence. TXT mirrors the same strings.

**Tech Stack:** Existing.

Spec: `docs/superpowers/specs/2026-09-06-condense-copy-design.md` — every exact string is there; use them verbatim.

## Global Constraints
- Strings exactly as the spec. No solver or counting change. StyleX only.
- `npm test`, `npm run typecheck`, `npm run build` pass; output warning-free.
- Commit messages: plain sentences, no conventional-commit prefixes, no "Fix X:" colon subjects; end with a blank line and `Claude-Session: https://claude.ai/code/session_01UqVWMP1ggg6Tk212ooHfZ2`. Stage files by path.

---

### Task 1: Condense copy and tidy the panel

**Files:** `src/solver/strategies.ts` (descriptions), `src/mounting/types.ts` (+ `link?: string`), `src/mounting/systems.ts` (descriptions, notes, link, rename), `src/mounting/hardware.ts` (pass `link` through into rows), `src/models/skadisInfinity.ts` (mirrorNote, thanks), `src/ui/App.tsx` (remove subtitle; credit `Boards by <name>. <thanks>`), `src/ui/InputPanel.tsx` (`Board` section `defaultOpen={false}`), `src/ui/PrintList.tsx` (assumed sentence → badge next to the caption; linked item names), `src/ui/SummaryChip.tsx` (strategy suffix only when not balanced), `src/export/printListText.ts` (` (model: <url>)`, credit line `Boards by <name> - <url>`), and every test that pins the old strings: `src/ui/App.test.tsx`, `src/ui/PrintList.test.tsx`, `src/ui/SummaryChip.test.tsx`, `src/export/printListText.test.ts`, `src/mounting/hardware.test.ts`, `src/mounting/index.test.ts`, `src/models/skadisInfinity.test.ts`.

- [ ] Update tests first (new strings and the new assertions listed in the spec's Testing section); run and see them fail.
- [ ] Apply the copy and UI changes. Caption markup: `<caption>` containing the text `Hardware` and, when assumed, a `<span>` badge `assumed` (11 px, outlined like the mirror badge). Keep the table's accessible name starting with `Hardware` (tests use `{ name: /^Hardware/ }`). Linked item: `<a href target="_blank" rel="noopener noreferrer">` with the item name, styled like the `Mount files` link. Remove the `assumedGap` style if unused.
- [ ] `npm test && npm run typecheck && npm run build`; commit: `Condense the panel copy and tidy the defaults`.

### Task 2: Screenshot check

Capture the panel for the default system and for the threaded system (assumed badge), plus the footer, and the first 30 lines of a download. Fix only real breakage. Same Playwright scratch setup as before (`/tmp/planner-shots`, port 5189, `kill $(lsof -t -i:5189)`).
