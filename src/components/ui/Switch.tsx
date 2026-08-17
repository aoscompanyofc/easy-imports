import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  label?: string;
  className?: string;
}

// Toggle estilo iOS ("Modo Avião" / Wi-Fi) — pílula que desliza entre verde (ligado) e cinza (desligado).
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, size = 'md', disabled, label, className }) => {
  const dims = size === 'sm'
    ? { track: 'w-9 h-5', knob: 'w-3.5 h-3.5', translate: 'translate-x-4' }
    : { track: 'w-12 h-7', knob: 'w-5 h-5', translate: 'translate-x-5' };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!checked); }}
      className={cn(
        'relative inline-flex flex-shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
        dims.track,
        checked ? 'bg-green-500' : 'bg-neutral-300',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      <span
        className={cn(
          'inline-block transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out',
          dims.knob,
          checked ? dims.translate : 'translate-x-1'
        )}
      />
    </button>
  );
};
