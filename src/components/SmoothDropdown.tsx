import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, Sparkles } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
  badgeText?: string;
  badgeTone?: 'green' | 'red' | 'neutral' | 'amber';
}

interface SmoothSelectProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: 'default' | 'amber' | 'navy' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
  menuMinWidth?: number;
}

interface MenuCoords {
  top: number;
  left: number;
  width: number;
  openUpward: boolean;
  maxHeight: number;
}

function computeMenuCoords(
  triggerEl: HTMLElement,
  desiredMinWidth: number
): MenuCoords {
  const rect = triggerEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;

  const width = Math.min(
    vw - margin * 2,
    Math.max(rect.width, desiredMinWidth)
  );

  let left = rect.left;
  if (left + width > vw - margin) {
    left = Math.max(margin, vw - width - margin);
  }
  if (left < margin) {
    left = margin;
  }

  const spaceBelow = vh - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const openUpward = spaceBelow < 240 && spaceAbove > spaceBelow;
  const maxHeight = Math.max(
    160,
    Math.min(380, (openUpward ? spaceAbove : spaceBelow) - 8)
  );

  const top = openUpward ? rect.top - 4 : rect.bottom + 4;

  return { top, left, width, openUpward, maxHeight };
}

export const SmoothSelect: React.FC<SmoothSelectProps> = ({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  placeholder = 'Select an option...',
  searchable = false,
  searchPlaceholder = 'Type to filter...',
  variant = 'default',
  size = 'md',
  className = '',
  menuMinWidth = 220,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const touchDragStateRef = useRef<{ x: number; y: number; moved: boolean }>({
    x: 0,
    y: 0,
    moved: false,
  });

  const hasValue = value.trim() !== '';
  const selectedOption = hasValue ? options.find((o) => o.value === value) : undefined;

  const updatePosition = () => {
    if (triggerRef.current) {
      setCoords(computeMenuCoords(triggerRef.current, menuMinWidth));
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      setFilterText('');
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase().trim();
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.value.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      (opt.group && opt.group.toLowerCase().includes(q))
    );
  });

  const grouped = React.useMemo(() => {
    const groups: Array<{ groupName: string | null; items: DropdownOption[] }> = [];
    filteredOptions.forEach((opt) => {
      const gName = opt.group || null;
      const existing = groups.find((g) => g.groupName === gName);
      if (existing) {
        existing.items.push(opt);
      } else {
        groups.push({ groupName: gName, items: [opt] });
      }
    });
    return groups;
  }, [filteredOptions]);

  const variantClasses =
    variant === 'navy'
      ? 'bg-[#1b2a4a] text-white border-[#1b2a4a] hover:bg-[#2c4268]'
      : variant === 'amber'
      ? 'bg-[#fff8dc] text-slate-900 border-slate-300 hover:border-slate-400'
      : variant === 'ghost'
      ? 'bg-transparent text-slate-900 border-transparent hover:bg-slate-100 hover:border-slate-300'
      : 'bg-white text-slate-900 border-slate-300 hover:border-slate-400';

  const sizeClasses =
    size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs';

  const badgeToneClass = (tone?: 'green' | 'red' | 'neutral' | 'amber') => {
    if (tone === 'green') return 'bg-[#d9ead3] text-[#137333]';
    if (tone === 'red') return 'bg-[#f4cccc] text-[#a50e0e]';
    if (tone === 'amber') return 'bg-[#fce8b2] text-slate-900';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-[#1b2a4a] cursor-pointer text-left ${variantClasses} ${sizeClasses} ${className}`}
      >
        <span
          className={`truncate ${
            hasValue
              ? 'font-semibold'
              : variant === 'navy'
              ? 'text-slate-300 font-normal'
              : 'text-slate-400 font-normal'
          }`}
        >
          {selectedOption ? selectedOption.label : hasValue ? value : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
            variant === 'navy' ? 'text-slate-200' : 'text-slate-500'
          } ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            aria-label={ariaLabel || 'Dropdown options'}
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : `${coords.top}px`,
              bottom: coords.openUpward
                ? `${window.innerHeight - coords.top}px`
                : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden flex flex-col"
          >
            {searchable && (
              <div className="p-2 border-b border-slate-200 bg-slate-50">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#1b2a4a]"
                  />
                </div>
              </div>
            )}

            <div
              style={{
                maxHeight: `${coords.maxHeight}px`,
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) {
                  touchDragStateRef.current = { x: t.clientX, y: t.clientY, moved: false };
                }
              }}
              onTouchMove={(e) => {
                const t = e.touches[0];
                if (!t) return;
                const dx = Math.abs(t.clientX - touchDragStateRef.current.x);
                const dy = Math.abs(t.clientY - touchDragStateRef.current.y);
                if (dx > 6 || dy > 6) {
                  touchDragStateRef.current.moved = true;
                }
              }}
              className="overflow-y-auto overscroll-contain touch-pan-y divide-y divide-slate-100 py-1"
            >
              {grouped.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-500">
                  No matching options
                </div>
              ) : (
                grouped.map((g, gIdx) => (
                  <div key={g.groupName || `group-${gIdx}`} className="py-0.5">
                    {g.groupName && (
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/80">
                        {g.groupName}
                      </div>
                    )}
                    {g.items.map((opt) => {
                      const isSelected = hasValue && opt.value === value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onMouseDown={(e) => {
                            // Keep focus on trigger/input on desktop mouse without blocking mobile touch scroll
                            e.preventDefault();
                          }}
                          onClick={() => {
                            if (touchDragStateRef.current.moved) {
                              touchDragStateRef.current.moved = false;
                              return;
                            }
                            onChange(opt.value);
                            setIsOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 sm:py-2 text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                            isSelected
                              ? 'bg-[#eef2f7] text-[#1b2a4a] font-bold'
                              : 'text-slate-800 hover:bg-slate-100 active:bg-slate-100'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate">{opt.label}</div>
                            {opt.sublabel && (
                              <div className="text-[11px] text-slate-500 truncate font-normal">
                                {opt.sublabel}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {opt.badgeText && (
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded ${badgeToneClass(
                                  opt.badgeTone
                                )}`}
                              >
                                {opt.badgeText}
                              </span>
                            )}
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#1b2a4a] shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

interface SmoothComboboxProps {
  id?: string;
  ariaLabel?: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  resolvedShortcutHint?: {
    matchedLabel: string;
    badgeText?: string;
    badgeTone?: 'green' | 'red' | 'neutral' | 'amber';
  } | null;
  className?: string;
  menuMinWidth?: number;
}

/**
 * SmoothCombobox replaces broken native <datalist> inputs.
 * Supports smooth momentum touch-scrolling on mobile/tablet without accidental selection on touchstart,
 * and shows only clean background placeholder text + dropdown chevron icon when empty.
 */
export const SmoothCombobox: React.FC<SmoothComboboxProps> = ({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  onBlur,
  placeholder = 'Select or type...',
  resolvedShortcutHint = null,
  className = '',
  menuMinWidth = 250,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTypingFilter, setIsTypingFilter] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const touchDragStateRef = useRef<{ x: number; y: number; moved: boolean }>({
    x: 0,
    y: 0,
    moved: false,
  });

  const updatePosition = () => {
    if (containerRef.current) {
      setCoords(computeMenuCoords(containerRef.current, menuMinWidth));
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (
        target &&
        !containerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setIsOpen(false);
        setIsTypingFilter(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsTypingFilter(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) {
        return;
      }
      updatePosition();
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const displayedOptions = React.useMemo(() => {
    if (!isTypingFilter || !value.trim()) {
      return options;
    }
    const q = value.toLowerCase().trim();
    const matches = options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
    return matches.length > 0 ? matches : options;
  }, [options, value, isTypingFilter]);

  const grouped = React.useMemo(() => {
    const groups: Array<{ groupName: string | null; items: DropdownOption[] }> = [];
    displayedOptions.forEach((opt) => {
      const gName = opt.group || null;
      const existing = groups.find((g) => g.groupName === gName);
      if (existing) {
        existing.items.push(opt);
      } else {
        groups.push({ groupName: gName, items: [opt] });
      }
    });
    return groups;
  }, [displayedOptions]);

  const badgeToneClass = (tone?: 'green' | 'red' | 'neutral' | 'amber') => {
    if (tone === 'green') return 'bg-[#d9ead3] text-[#137333]';
    if (tone === 'red') return 'bg-[#f4cccc] text-[#a50e0e]';
    if (tone === 'amber') return 'bg-[#fce8b2] text-slate-900';
    return 'bg-slate-100 text-slate-700';
  };

  const hasValue = value.trim() !== '';

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          value={value}
          onFocus={() => {
            setIsTypingFilter(false);
            setIsOpen(true);
          }}
          onClick={() => {
            setIsTypingFilter(false);
            setIsOpen(true);
          }}
          onChange={(e) => {
            setIsTypingFilter(true);
            setIsOpen(true);
            onChange(e.target.value);
          }}
          onBlur={() => {
            onBlur?.();
          }}
          placeholder={placeholder}
          className="w-full pl-3 pr-8 py-2 text-xs font-medium bg-[#fff8dc]/80 border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#1b2a4a]"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle options list"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={() => {
            setIsTypingFilter(false);
            setIsOpen((prev) => !prev);
          }}
          className="absolute right-0 inset-y-0 px-2.5 flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#1b2a4a]' : ''
            }`}
          />
        </button>
      </div>

      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : `${coords.top}px`,
              bottom: coords.openUpward
                ? `${window.innerHeight - coords.top}px`
                : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="bg-white border border-slate-300 rounded-lg shadow-xl overflow-hidden flex flex-col"
          >
            {/* Shorthand match helper banner when typing */}
            {resolvedShortcutHint && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(resolvedShortcutHint.matchedLabel);
                  setIsOpen(false);
                  setIsTypingFilter(false);
                }}
                className="w-full px-3 py-2 bg-[#fff8dc] border-b border-amber-200 text-xs flex items-center justify-between gap-2 text-left hover:bg-[#fce8b2]/70 cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Use "{resolvedShortcutHint.matchedLabel}"</span>
                </span>
                {resolvedShortcutHint.badgeText && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded ${badgeToneClass(
                      resolvedShortcutHint.badgeTone
                    )}`}
                  >
                    {resolvedShortcutHint.badgeText}
                  </span>
                )}
              </button>
            )}

            <div
              style={{
                maxHeight: `${coords.maxHeight}px`,
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
              }}
              onTouchStart={(e) => {
                const t = e.touches[0];
                if (t) {
                  touchDragStateRef.current = { x: t.clientX, y: t.clientY, moved: false };
                }
              }}
              onTouchMove={(e) => {
                const t = e.touches[0];
                if (!t) return;
                const dx = Math.abs(t.clientX - touchDragStateRef.current.x);
                const dy = Math.abs(t.clientY - touchDragStateRef.current.y);
                if (dx > 6 || dy > 6) {
                  touchDragStateRef.current.moved = true;
                }
              }}
              className="overflow-y-auto overscroll-contain touch-pan-y divide-y divide-slate-100 py-1"
            >
              {grouped.map((g, gIdx) => (
                <div key={g.groupName || `cb-group-${gIdx}`} className="py-0.5">
                  {g.groupName && (
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/90">
                      {g.groupName}
                    </div>
                  )}
                  {g.items.map((opt) => {
                    const isSelected =
                      hasValue &&
                      (opt.value.toLowerCase() === value.trim().toLowerCase() ||
                        opt.label.toLowerCase() === value.trim().toLowerCase());
                    return (
                      <button
                        key={opt.value || opt.label}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={() => {
                          if (touchDragStateRef.current.moved) {
                            touchDragStateRef.current.moved = false;
                            return;
                          }
                          onChange(opt.value);
                          setIsOpen(false);
                          setIsTypingFilter(false);
                        }}
                        className={`w-full px-3 py-2.5 sm:py-2 text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer select-none ${
                          isSelected
                            ? 'bg-[#eef2f7] text-[#1b2a4a] font-bold'
                            : 'text-slate-800 hover:bg-slate-100 active:bg-slate-100'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{opt.label}</div>
                          {opt.sublabel && (
                            <div className="text-[11px] text-slate-500 truncate font-normal">
                              {opt.sublabel}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.badgeText && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded ${badgeToneClass(
                                opt.badgeTone
                              )}`}
                            >
                              {opt.badgeText}
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#1b2a4a] shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export const PAYMENT_METHOD_OPTIONS: DropdownOption[] = [
  {
    value: 'Digital',
    label: 'Digital (Bank / Online)',
    sublabel: 'Bank transfer, mobile wallet, debit card',
    badgeText: 'Digital',
    badgeTone: 'neutral',
  },
  {
    value: 'Cash',
    label: 'Cash',
    sublabel: 'Physical cash in hand',
    badgeText: 'Cash',
    badgeTone: 'green',
  },
  {
    value: 'Credit',
    label: 'Credit Card',
    sublabel: 'Credit card or pay-later account',
    badgeText: 'Credit',
    badgeTone: 'amber',
  },
];

export const FLOW_TYPE_OPTIONS: DropdownOption[] = [
  {
    value: 'Outgoing',
    label: 'Money Out (Expense)',
    sublabel: 'Spending, bills, charity, or giving a loan',
    badgeText: 'Out',
    badgeTone: 'red',
  },
  {
    value: 'Incoming',
    label: 'Money In (Income)',
    sublabel: 'Salary, bonus, gift received, or loan recovery',
    badgeText: 'In',
    badgeTone: 'green',
  },
];

export function buildCategoryDropdownOptions(
  expenseNames: string[],
  incomingSources: readonly string[]
): DropdownOption[] {
  const outOpts: DropdownOption[] = expenseNames.map((name) => ({
    value: name,
    label: name,
    group: 'Expense Categories (Money Out)',
    badgeText: 'Expense',
    badgeTone: 'red',
  }));

  const inOpts: DropdownOption[] = incomingSources.map((name) => ({
    value: name,
    label: name,
    group: 'Income & Loan Sources (Money In)',
    badgeText: 'Money In',
    badgeTone: 'green',
  }));

  return [...outOpts, ...inOpts];
}

export function buildMonthDropdownOptions(activeYear: number): DropdownOption[] {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return [
    {
      value: 'Current',
      label: `Current Month (October ${activeYear})`,
      sublabel: 'Default active month',
      badgeText: 'Current',
      badgeTone: 'amber',
    },
    ...months.map((m) => ({
      value: `${m} ${activeYear}`,
      label: `${m} ${activeYear}`,
    })),
  ];
}
