import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, helperText, className, type, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            className={cn(
              'w-full bg-white border border-neutral-200 rounded-lg px-4 py-3 text-neutral-900 placeholder:text-neutral-400 transition-all outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
              leftIcon && 'pl-11',
              rightIcon && 'pr-11',
              error && 'border-danger focus:ring-danger/25 focus:border-danger',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-danger font-medium" role="alert">{error}</p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-xs text-neutral-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
