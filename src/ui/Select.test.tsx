import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select } from './Select';

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
];

describe('Select', () => {
  it('shows the selected label and stays closed until clicked', () => {
    render(<Select value="b" onChange={() => {}} options={options} />);
    expect(screen.getByRole('combobox').textContent).toBe('Bravo');
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('marks the current value as the selected option', () => {
    render(<Select value="b" onChange={() => {}} options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Alpha' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('option', { name: 'Bravo' }).getAttribute('aria-selected')).toBe('true');
  });

  it('clicking an option reports it and closes, returning focus to the trigger', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'Charlie' }));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('combobox'));
  });

  it('Escape closes the list without reporting a change', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes without reporting a change when a pointerdown lands outside it', () => {
    const onChange = vi.fn();
    render(
      <div>
        <Select value="a" onChange={onChange} options={options} />
        <button type="button">elsewhere</button>
      </div>,
    );
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'elsewhere' }));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ArrowDown/ArrowUp move the active option, and Enter commits it', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('ArrowUp does not move before the first option', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('Home and End jump to the first and last option', () => {
    const onChange = vi.fn();
    render(<Select value="b" onChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    fireEvent.keyDown(listbox, { key: 'End' });
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('c');

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Home' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  it('typing while open jumps the active option to the first matching label', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={options} />);
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'c' });
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('typing on the closed trigger jumps straight to the first matching option', () => {
    const onChange = vi.fn();
    render(<Select value="a" onChange={onChange} options={options} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'b' });
    expect(onChange).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('ArrowDown on the closed trigger opens the list at the current value', () => {
    render(<Select value="b" onChange={() => {}} options={options} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Bravo' }).getAttribute('aria-selected')).toBe('true');
  });
});
