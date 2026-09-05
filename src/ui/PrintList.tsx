import * as stylex from '@stylexjs/stylex';
import type { Plan, BoardGroup } from '../solver';
import type { BoardModel } from '../models';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

const styles = stylex.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.md,
    padding: space.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: space.md,
  },
  heading: {
    fontSize: font.sm,
    fontWeight: 600,
    margin: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: font.sm,
  },
  th: {
    textAlign: 'left',
    fontWeight: 500,
    fontSize: font.xs,
    color: colors.muted,
    paddingBlock: space.xs,
    paddingInline: space.sm,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.border,
  },
  td: {
    paddingBlock: space.sm,
    paddingInline: space.sm,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.border,
  },
  count: {
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  mirror: {
    display: 'inline-block',
    fontSize: font.xs,
    color: colors.accent,
    backgroundColor: mixes.inputBg,
    borderRadius: radius.sm,
    paddingBlock: '2px',
    paddingInline: space.sm,
  },
  note: {
    fontSize: font.xs,
    color: colors.muted,
    margin: 0,
    lineHeight: 1.5,
  },
  link: {
    color: colors.accent,
  },
});

function mirrorLabel(g: BoardGroup): string | null {
  if (g.mirrorX && g.mirrorY) return 'Mirror X + Y';
  if (g.mirrorX) return 'Mirror X';
  if (g.mirrorY) return 'Mirror Y';
  return null;
}

export function PrintList({ plan, model }: { plan: Plan | null; model: BoardModel }) {
  if (!plan) return null;
  return (
    <section {...stylex.props(styles.card)}>
      <h2 {...stylex.props(styles.heading)}>Print list</h2>
      <table {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th {...stylex.props(styles.th)}>Size</th>
            <th {...stylex.props(styles.th)}>Holes</th>
            <th {...stylex.props(styles.th)}>Qty</th>
            <th {...stylex.props(styles.th)}>Mirror</th>
          </tr>
        </thead>
        <tbody>
          {plan.groups.map((g) => {
            const label = mirrorLabel(g);
            return (
              <tr key={`${g.cols}x${g.rows}-${g.mirrorX}-${g.mirrorY}`}>
                <td {...stylex.props(styles.td)}>
                  {g.widthMm} × {g.heightMm} mm
                </td>
                <td {...stylex.props(styles.td)}>
                  {g.cols} × {g.rows}
                </td>
                <td {...stylex.props(styles.td, styles.count)}>{g.count}</td>
                <td {...stylex.props(styles.td)}>
                  {label ? <span {...stylex.props(styles.mirror)}>{label}</span> : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p {...stylex.props(styles.note)}>{model.mirrorNote}</p>
      <p {...stylex.props(styles.note)}>
        Files:{' '}
        <a {...stylex.props(styles.link)} href={model.url} target="_blank" rel="noreferrer">
          {model.name} on MakerWorld
        </a>
      </p>
    </section>
  );
}
