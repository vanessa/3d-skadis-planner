import { useEffect, useId, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { colors, font, radius, space } from './tokens.stylex';
import { mixes } from './mixes.stylex';

export interface SelectOption {
  value: string;
  label: string;
}

const styles = stylex.create({
  wrap: {
    position: 'relative',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    height: '28px',
    width: '100%',
    minWidth: 0,
    paddingInline: space.sm,
    fontSize: font.sm,
    lineHeight: '1.625',
    color: colors.text,
    backgroundColor: mixes.inputBg,
    backgroundClip: 'padding-box',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: {
      default: mixes.border,
      ':hover': mixes.borderHover,
    },
    borderRadius: radius.lg,
    outlineWidth: { default: '0px', ':focus-visible': '2px' },
    outlineStyle: 'solid',
    outlineColor: colors.ring,
    outlineOffset: '2px',
    cursor: 'default',
    transitionProperty: 'border-color',
    transitionDuration: '120ms',
  },
  triggerLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'start',
  },
  chevron: {
    flexShrink: 0,
    width: '12px',
    height: '12px',
    color: colors.muted,
  },
  listbox: {
    position: 'absolute',
    zIndex: 20,
    top: 'calc(100% + 4px)',
    insetInlineStart: 0,
    insetInlineEnd: 0,
    maxHeight: '240px',
    overflowY: 'auto',
    margin: 0,
    padding: space.xs,
    listStyle: 'none',
    outlineWidth: '0px',
    outlineStyle: 'none',
    backgroundColor: colors.surface,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: mixes.border,
    borderRadius: radius.lg,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.24)',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: space.xs,
    height: '28px',
    paddingInlineStart: space.xs,
    paddingInlineEnd: space.sm,
    borderRadius: radius.sm,
    fontSize: font.sm,
    color: colors.text,
    cursor: 'default',
    userSelect: 'none',
  },
  optionActive: {
    backgroundColor: mixes.inputBg,
  },
  checkSlot: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '14px',
    height: '14px',
  },
  check: {
    width: '14px',
    height: '14px',
    color: colors.text,
  },
});

function ChevronIcon() {
  return (
    <svg {...stylex.props(styles.chevron)} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...stylex.props(styles.check)} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

/** How long a run of typed characters counts as one type-ahead search, in ms. */
const TYPEAHEAD_RESET_MS = 700;

/**
 * A shadcn-styled listbox: a bordered trigger button showing the current
 * value, opening a floating custom-rendered option list on click (not the
 * browser's native select popup, so every option can be styled). Supports
 * arrow-key navigation, Home/End, Enter/Escape, click-outside-to-close, and
 * type-ahead (typing jumps to the first option starting with what you typed).
 */
export function Select({
  id, value, onChange, options,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)));
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeaheadRef = useRef<{ text: string; timer: ReturnType<typeof setTimeout> | null }>({
    text: '',
    timer: null,
  });
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const listId = `${triggerId}-listbox`;
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [open]);

  const openAt = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(options.length - 1, index)));
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const typeahead = (char: string): number | null => {
    const state = typeaheadRef.current;
    if (state.timer) clearTimeout(state.timer);
    state.text += char.toLowerCase();
    state.timer = setTimeout(() => {
      state.text = '';
    }, TYPEAHEAD_RESET_MS);
    const from = open ? activeIndex : options.findIndex((o) => o.value === value);
    const ordered = [...options.slice(from + 1), ...options.slice(0, from + 1)];
    const match = ordered.find((o) => o.label.toLowerCase().startsWith(state.text));
    return match ? options.indexOf(match) : null;
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openAt(options.findIndex((o) => o.value === value));
      return;
    }
    if (e.key.length === 1 && e.key !== ' ') {
      const index = typeahead(e.key);
      if (index !== null) onChange(options[index].value);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      commit(activeIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key.length === 1) {
      const index = typeahead(e.key);
      if (index !== null) setActiveIndex(index);
    }
  };

  return (
    <div ref={wrapRef} {...stylex.props(styles.wrap)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => (open ? setOpen(false) : openAt(options.findIndex((o) => o.value === value)))}
        onKeyDown={onTriggerKeyDown}
        {...stylex.props(styles.trigger)}
      >
        <span {...stylex.props(styles.triggerLabel)}>{selected?.label ?? ''}</span>
        <ChevronIcon />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${listId}-${activeIndex}`}
          onKeyDown={onListKeyDown}
          ref={(node) => node?.focus()}
          {...stylex.props(styles.listbox)}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              onClick={() => commit(i)}
              onMouseEnter={() => setActiveIndex(i)}
              {...stylex.props(styles.option, i === activeIndex && styles.optionActive)}
            >
              <span {...stylex.props(styles.checkSlot)}>{o.value === value && <CheckIcon />}</span>
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
