import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { skadisInfinity } from '../models/skadisInfinity';
import { FORM_STORAGE_KEY } from './formStorage';
import { DEFAULT_FORM } from './planState';

vi.mock('./download', () => ({ downloadText: vi.fn() }));
import { downloadText } from './download';

/** Opens the custom Select labelled `labelText` and clicks the option named `optionText`. */
function selectOption(labelText: string, optionText: string) {
  fireEvent.click(screen.getByLabelText(labelText));
  fireEvent.click(screen.getByRole('option', { name: optionText }));
}

describe('App', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders the title and the default plan', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Skadis Planner' })).toBeTruthy();
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
    selectOption('Printer', 'Custom bed size');
    expect(screen.getByLabelText('Bed width')).toBeTruthy();
    expect(screen.getByLabelText('Bed depth')).toBeTruthy();
  });

  it('converts the typed values when the unit changes', () => {
    render(<App />);
    selectOption('Unit', 'cm');
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

  it('links to the model files below the Board input', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));
    const link = screen.getByRole('link', { name: 'Board files' }) as HTMLAnchorElement;
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
    fireEvent.click(screen.getByLabelText('Strategy'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Balanced', 'Largest boards first', 'Same size only', 'No mirroring', 'Allow a gap',
    ]);
    expect(screen.queryByLabelText('Max gap (mm)')).toBeNull();
    fireEvent.click(screen.getByRole('option', { name: 'Allow a gap' }));
    expect((screen.getByLabelText('Max gap (mm)') as HTMLInputElement).value).toBe('40');
    expect(screen.getByText(/12 boards/)).toBeTruthy();
  });

  it('downloads the print list as text', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [name, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(name).toBe('skadis-plan-1000x600.txt');
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
    const credit = link.closest('p');
    expect(credit).toBeTruthy();
    expect((credit!.textContent ?? '').replace(/\s+/g, ' ').trim()).toMatch(/^Boards and mounts by AU3D\. Thank you!$/);
  });

  it('offers mounting systems and links to the mount files', () => {
    render(<App />);
    const link = screen.getByRole('link', { name: 'Mount files' }) as HTMLAnchorElement;
    expect(link.href).toBe('https://makerworld.com/en/models/861073#profileId-1609221');

    fireEvent.click(screen.getByLabelText('System'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Wall mounts (AU3D)', 'Screw spacers (AU3D)',
    ]);
    fireEvent.click(screen.getByRole('option', { name: 'Screw spacers (AU3D)' }));
    expect((screen.getByRole('link', { name: 'Mount files' }) as HTMLAnchorElement).href).toBe(
      'https://makerworld.com/en/models/418874#profileId-321444',
    );
    expect(screen.getByText(/A spacer and screw at each board corner/)).toBeTruthy();
    const hardwareTable = screen.getByRole('table', { name: /^Hardware/ });
    expect(within(hardwareTable).getByText('Screw spacer')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    const [, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(text).toContain('Hardware (Screw spacers (AU3D), 10 mm from the wall)');
    expect(text).toContain('Screw spacer');
  });

  it('defaults the wall distance to 10 mm and points every link at that profile', () => {
    render(<App />);
    const distance = screen.getByLabelText('Wall distance');
    expect(distance.textContent).toBe('10 mm');
    fireEvent.click(distance);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['10 mm', '20 mm']);
    fireEvent.click(screen.getByRole('option', { name: '10 mm' }));
    const single = screen.getByRole('link', { name: 'Print Single wall mount' }) as HTMLAnchorElement;
    expect(single.href).toBe('https://makerworld.com/en/models/420877#profileId-323619');
    const quad = screen.getByRole('link', { name: 'Print Quad wall mount' }) as HTMLAnchorElement;
    expect(quad.href).toBe('https://makerworld.com/en/models/861073#profileId-1609221');

    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    const [, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(text).toContain('Hardware (Wall mounts (AU3D), 10 mm from the wall)');
    expect(text).toContain('(model: https://makerworld.com/en/models/420877#profileId-323619)');
    expect(text).toContain('Mount files: https://makerworld.com/en/models/861073#profileId-1609221');
  });

  it('switches every link when the wall distance changes', () => {
    render(<App />);
    selectOption('Wall distance', '20 mm');
    expect((screen.getByRole('link', { name: 'Mount files' }) as HTMLAnchorElement).href).toBe(
      'https://makerworld.com/en/models/861073#profileId-811358',
    );
    expect((screen.getByRole('link', { name: 'Print Single wall mount' }) as HTMLAnchorElement).href).toBe(
      'https://makerworld.com/en/models/420877#profileId-323616',
    );
  });

  it('keeps the wall distance across systems when offered and falls back to the default otherwise', () => {
    render(<App />);
    selectOption('Wall distance', '20 mm');
    selectOption('System', 'Screw spacers (AU3D)');
    let distance = screen.getByLabelText('Wall distance');
    expect(distance.textContent).toBe('20 mm');
    fireEvent.click(distance);
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['10 mm', '15 mm', '20 mm']);
    fireEvent.click(screen.getByRole('option', { name: '15 mm' }));

    selectOption('System', 'Wall mounts (AU3D)');
    distance = screen.getByLabelText('Wall distance');
    expect(distance.textContent).toBe('10 mm');
  });

  it('shows a screw hole padding field for wall mounts, defaulting to 9mm and feeding the drill point measurements', () => {
    render(<App />);
    const padding = screen.getByLabelText('Screw hole padding (mm)') as HTMLInputElement;
    expect(padding.value).toBe('9');
    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    const [, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(text).toContain('X: 9, 200, 400, 600, 800, 991');
    expect(text).toContain('Y: 9, 200, 400, 591');
  });

  it('shows the screw hole padding field for screw spacers too, defaulting to its own 10mm', () => {
    render(<App />);
    selectOption('System', 'Screw spacers (AU3D)');
    expect((screen.getByLabelText('Screw hole padding (mm)') as HTMLInputElement).value).toBe('10');
  });

  it('updates the screw spacers drill point measurements when the screw hole padding changes', () => {
    render(<App />);
    selectOption('System', 'Screw spacers (AU3D)');
    fireEvent.change(screen.getByLabelText('Screw hole padding (mm)'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    const [, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    // Board corners now inset 20mm instead of 10mm from each 200mm board's edge.
    expect(text).toContain('X: 20, 180, 220, 380, 420, 580, 620, 780, 820, 980');
    expect(text).toContain('Y: 20, 180, 220, 380, 420, 580');
  });

  it('updates the drill point measurements when the screw hole padding changes', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Screw hole padding (mm)'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    const [, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(text).toContain('X: 20, 200, 400, 600, 800, 980');
    expect(text).toContain('Y: 20, 200, 400, 580');
  });

  it('resets the screw hole padding to the new system\'s default when switching systems', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Screw hole padding (mm)'), { target: { value: '5' } });
    selectOption('System', 'Screw spacers (AU3D)');
    selectOption('System', 'Wall mounts (AU3D)');
    expect((screen.getByLabelText('Screw hole padding (mm)') as HTMLInputElement).value).toBe('9');
  });

  it('includes the mounting hardware in the downloaded print list', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Download print list' }));
    const [, text] = (downloadText as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(text).toContain('Quad wall mount');
  });

  it('draws the mounting hardware markers on the canvas and updates them when the system changes', () => {
    const { container } = render(<App />);
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(24);
    selectOption('System', 'Screw spacers (AU3D)');
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(60);
  });

  it('lights the matching hardware markers when hovering the Quad wall mount row and clears them on leave', () => {
    const { container } = render(<App />);
    const row = screen.getByText('Quad wall mount').closest('tr')!;
    fireEvent.pointerEnter(row);
    expect(container.querySelectorAll('[data-lit]')).toHaveLength(8);
    fireEvent.pointerLeave(row);
    expect(container.querySelectorAll('[data-lit]')).toHaveLength(0);
  });

  it('writes the form to local storage when the width changes', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '500' } });
    const stored = JSON.parse(window.localStorage.getItem(FORM_STORAGE_KEY) ?? '{}');
    expect(stored.width).toBe('500');
  });

  it('does not persist a form that fails to compute', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '500' } });
    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '' } });
    expect(screen.getByRole('alert')).toBeTruthy();
    const stored = JSON.parse(window.localStorage.getItem(FORM_STORAGE_KEY) ?? '{}');
    expect(stored.width).toBe('500');
  });

  it('renders the plan from a pre-seeded stored form', () => {
    window.localStorage.setItem(
      FORM_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_FORM, width: '820', height: '1000' }),
    );
    render(<App />);
    expect(screen.getByText(/820 × 1000 mm/)).toBeTruthy();
  });

  it('toggles the dimension overlay on the canvas, keeping the mount markers visible throughout', () => {
    const { container } = render(<App />);
    const markerCount = container.querySelectorAll('[data-marker]').length;
    expect(markerCount).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-dim-line]')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Measurements view' }));
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(markerCount);
    expect(container.querySelectorAll('[data-dim-line]').length).toBeGreaterThan(0);
    // The outer corner mount insets 9mm from the true 1000/600 boundary.
    expect(container.querySelector('[data-dim-line][data-axis="x"][data-value="991"]')).toBeTruthy();
    expect(container.querySelector('[data-dim-line][data-axis="y"][data-value="591"]')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Measurements view' }));
    expect(container.querySelectorAll('[data-marker]')).toHaveLength(markerCount);
    expect(container.querySelectorAll('[data-dim-line]')).toHaveLength(0);
  });

  it('renders the Measurements toggle in the sidebar, not floating over the canvas', () => {
    render(<App />);
    const sidebar = screen.getByRole('complementary', { name: 'Skadis Planner' });
    expect(within(sidebar).getByRole('button', { name: 'Measurements view' })).toBeTruthy();
    const canvas = screen.getByRole('main');
    expect(within(canvas).queryByRole('button', { name: 'Measurements view' })).toBeNull();
  });

  it('resets the form to defaults, clears storage, and disables itself again', () => {
    render(<App />);
    const resetButton = screen.getByRole('button', { name: 'Reset to defaults' });
    expect((resetButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText('Width'), { target: { value: '500' } });
    expect((resetButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(resetButton);
    expect(screen.getByText(/15 boards/)).toBeTruthy();
    expect(window.localStorage.getItem(FORM_STORAGE_KEY)).toBeNull();
    expect((resetButton as HTMLButtonElement).disabled).toBe(true);
  });
});
