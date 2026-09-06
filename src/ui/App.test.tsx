import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { skadisInfinity } from '../models/skadisInfinity';

vi.mock('./download', () => ({ downloadText: vi.fn() }));
import { downloadText } from './download';

describe('App', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders the title and the default plan', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Board planner' })).toBeTruthy();
    expect(screen.getByText(/15 boards/)).toBeTruthy();
  });

  it('recomputes when the width changes', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '500' } });
    expect(screen.getByText(/9 boards/)).toBeTruthy();
  });

  it('shows an error and keeps the last plan on invalid input', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '' } });
    expect(screen.getByRole('alert').textContent).toMatch(/width/i);
    expect(screen.getByText(/15 boards/)).toBeTruthy();
  });

  it('reveals bed inputs for a custom printer', () => {
    render(<App />);
    expect(screen.queryByLabelText('Bed width')).toBeNull();
    fireEvent.change(screen.getByLabelText('Printer'), { target: { value: 'custom' } });
    expect(screen.getByLabelText('Bed width')).toBeTruthy();
    expect(screen.getByLabelText('Bed depth')).toBeTruthy();
  });

  it('converts the typed values when the unit changes', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'cm' } });
    expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('100');
    expect(screen.getByText(/15 boards/)).toBeTruthy();
  });

  it('does not show a leftover fragment when it rounds to 0 mm', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '1000.3' } });
    expect(screen.getByText(/15 boards/)).toBeTruthy();
    expect(screen.queryByText(/left on the right/)).toBeNull();
  });

  it('shows a leftover fragment when it rounds above 0 mm', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '1015' } });
    expect(screen.getByText(/15 mm left on the right/)).toBeTruthy();
  });

  it('shows an error and keeps the last plan under StrictMode', () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '' } });
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/15 boards/)).toBeTruthy();
  });

  it('links to the model files from the panel footer', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: /Open files on MakerWorld/ }) as HTMLAnchorElement;
    expect(link.href).toBe(skadisInfinity.url);
  });

  it('applies the light theme class to the document when light is chosen', () => {
    render(<App />);
    const before = document.documentElement.className;
    fireEvent.click(screen.getByRole('button', { name: 'Light theme' }));
    expect(document.documentElement.className).not.toBe(before);
    expect(document.documentElement.style.colorScheme).toBe('light');
    fireEvent.click(screen.getByRole('button', { name: 'Dark theme' }));
    expect(document.documentElement.className).toBe(before);
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('exposes the canvas as the main landmark', () => {
    render(<App />);
    expect(screen.getByRole('main')).toBeTruthy();
  });


  it('shows the fit control and zoom readout on the canvas', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Fit to view' })).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('offers layout strategies and shows the gap field only for allow-gap', () => {
    render(<App />);
    const select = screen.getByLabelText('Strategy') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent)).toEqual([
      'Balanced', 'Largest boards first', 'Same size only', 'No mirroring', 'Allow a gap',
    ]);
    expect(screen.queryByLabelText('Max gap (mm)')).toBeNull();
    fireEvent.change(select, { target: { value: 'allow-gap' } });
    expect((screen.getByLabelText('Max gap (mm)') as HTMLInputElement).value).toBe('40');
    expect(screen.getByText(/12 boards/)).toBeTruthy();
  });

  it('downloads the print list as text', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [name, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(name).toBe('board-plan-1000x600.txt');
    expect(text).toContain('9 x 9.stl');
    expect(text).toContain('Strategy: Balanced');
    expect(text).toContain('Printer:  Bambu Lab A1 (bed 256 x 256 mm)');
  });

  it('disables the download button while the form is invalid', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '' } });
    expect((screen.getByRole('button', { name: 'Download print list' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '1000' } });
    expect((screen.getByRole('button', { name: 'Download print list' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('credits the author in the footer', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: 'AU3D' }) as HTMLAnchorElement;
    expect(link.href).toBe('https://makerworld.com/en/@AU3D');
    expect(screen.getByText(/Thank you for sharing them!/)).toBeTruthy();
  });
});
