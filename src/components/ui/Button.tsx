import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading,
  fullWidth,
  iconOnly,
  className,
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary text-neutral-900 font-semibold hover:bg-primary-600 shadow-sm',
    secondary: 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300',
    danger: 'bg-white border border-red-200 text-danger hover:bg-red-50',
    ghost: 'text-neutral-600 hover:bg-neutral-100 border border-transparent',
  };

  const sizes = {
    sm: iconOnly ? 'w-9 h-9 text-xs' : 'h-9 px-3 text-sm',
    md: iconOnly ? 'w-11 h-11 text-base' : 'h-11 px-5 text-base',
    lg: iconOnly ? 'w-13 h-13 text-lg' : 'h-13 px-6 text-lg',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200',
        'active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none gap-2',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        iconOnly && 'p-0',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn(size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6', 'animate-spin')} aria-label="Loading" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
