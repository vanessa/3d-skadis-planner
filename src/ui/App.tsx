import * as stylex from '@stylexjs/stylex';
import { colors, font, space } from './tokens.stylex';

const styles = stylex.create({
  page: {
    minHeight: '100vh',
    backgroundColor: colors.bg,
    color: colors.text,
    padding: space.xl,
  },
  title: {
    fontSize: font.sizeLg,
    fontWeight: 600,
    margin: 0,
  },
});

export default function App() {
  return (
    <main {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.title)}>Board planner</h1>
    </main>
  );
}
