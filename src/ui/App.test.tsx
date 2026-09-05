import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
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
});
