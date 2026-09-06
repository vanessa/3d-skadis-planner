import * as stylex from '@stylexjs/stylex';
import type { Plan, BoardGroup } from '../solver';
import type { BoardModel } from '../models';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

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
    paddingInlineStart: 0,
    paddingInlineEnd: space.sm,
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: mixes.divider,
  },
  thEnd: {
    textAlign: 'end',
  },
  td: {
    paddingBlock: space.sm,
    paddingInlineStart: 0,
    paddingInlineEnd: space.sm,
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
  asIs: {
    color: colors.muted,
  },
  note: {
    fontSize: font.xs,
    color: colors.muted,
    margin: 0,
    lineHeight: 1.5,
  },
});

function mirrorLabel(g: BoardGroup): string | null {
  if (g.mirrorX && g.mirrorY) return 'mirrored X + Y';
  if (g.mirrorX) return 'mirrored X';
  if (g.mirrorY) return 'mirrored Y';
  return null;
}

export function PrintList({ plan, model }: { plan: Plan | null; model: BoardModel }) {
  if (!plan) return null;
  return (
    <>
      <table {...stylex.props(styles.table)}>
        <thead>
          <tr>
            <th scope="col" {...stylex.props(styles.th)}>
              File
            </th>
            <th scope="col" {...stylex.props(styles.th)}>
              Size
            </th>
            <th scope="col" {...stylex.props(styles.th, styles.thEnd)}>
              Qty
            </th>
            <th scope="col" {...stylex.props(styles.th)}>
              Print as
            </th>
          </tr>
        </thead>
        <tbody>
          {plan.groups.map((g) => {
            const label = mirrorLabel(g);
            return (
              <tr key={`${g.cols}x${g.rows}-${g.mirrorX}-${g.mirrorY}`}>
                <td {...stylex.props(styles.td)}>{model.fileName(g.cols, g.rows)}</td>
                <td {...stylex.props(styles.td)}>
                  {g.widthMm} × {g.heightMm} mm
                </td>
                <td {...stylex.props(styles.td, styles.count)}>{g.count}</td>
                <td {...stylex.props(styles.td)}>
                  {label ? (
                    <span {...stylex.props(styles.mirror)}>{label}</span>
                  ) : (
                    <span {...stylex.props(styles.asIs)}>as is</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p {...stylex.props(styles.note)}>{model.mirrorNote}</p>
    </>
  );
}
