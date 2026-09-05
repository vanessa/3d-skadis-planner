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
