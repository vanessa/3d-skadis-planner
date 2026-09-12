import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberField, SelectField } from './fields';

describe('fields', () => {
  it('NumberField wires the label, step and change handler', () => {
    const onChange = vi.fn();
    render(<NumberField label="Width" value="10" onChange={onChange} />);
    const input = screen.getByLabelText('Width') as HTMLInputElement;
    expect(input.type).toBe('number');
    expect(input.getAttribute('step')).toBe('any');
    expect(input.value).toBe('10');
    fireEvent.change(input, { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith('12');
  });

  it('SelectField opens a custom listbox and reports the chosen option', () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="Unit"
        value="mm"
        onChange={onChange}
        options={[
          { value: 'mm', label: 'mm' },
          { value: 'cm', label: 'cm' },
        ]}
      />,
    );
    const trigger = screen.getByLabelText('Unit');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    fireEvent.click(screen.getByRole('option', { name: 'cm' }));
    expect(onChange).toHaveBeenCalledWith('cm');
    // Choosing an option closes the list and returns focus to the trigger.
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('marks the current value as the selected option, and Escape closes without changing it', () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="Unit"
        value="mm"
        onChange={onChange}
        options={[
          { value: 'mm', label: 'mm' },
          { value: 'cm', label: 'cm' },
        ]}
      />,
    );
    fireEvent.click(screen.getByLabelText('Unit'));
    expect(screen.getByRole('option', { name: 'mm' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('option', { name: 'cm' }).getAttribute('aria-selected')).toBe('false');
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
