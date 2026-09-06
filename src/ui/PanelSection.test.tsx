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

  it('defaults to data-tone="default" and sets data-tone="emphasis" when passed', () => {
    const { container, rerender } = render(
      <PanelSection title="Space">
        <p>body</p>
      </PanelSection>,
    );
    expect(container.querySelector('section')!.getAttribute('data-tone')).toBe('default');
    rerender(
      <PanelSection title="Space" tone="emphasis">
        <p>body</p>
      </PanelSection>,
    );
    expect(container.querySelector('section')!.getAttribute('data-tone')).toBe('emphasis');
  });
});
