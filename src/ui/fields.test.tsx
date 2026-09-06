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

  it('SelectField renders options and reports the chosen value', () => {
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
    const select = screen.getByLabelText('Unit') as HTMLSelectElement;
    expect(select.options).toHaveLength(2);
    fireEvent.change(select, { target: { value: 'cm' } });
    expect(onChange).toHaveBeenCalledWith('cm');
  });

  it('styles options explicitly so native popups stay readable in dark mode', () => {
    render(
      <SelectField
        label="Unit"
        value="mm"
        onChange={() => {}}
        options={[
          { value: 'mm', label: 'mm' },
          { value: 'cm', label: 'cm' },
        ]}
      />,
    );
    const options = (screen.getByLabelText('Unit') as HTMLSelectElement).options;
    expect(options[0].className).not.toBe('');
    expect(options[1].className).toBe(options[0].className);
  });
});
