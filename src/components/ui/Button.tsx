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
    primary: 'bg-primary text-neutral-900 font-semibold hover:bg-primary-600 border-transparent shadow-card',
    secondary: 'bg-white border-neutral-200 text-neutral-900 hover:bg-neutral-50 shadow-card',
    danger: 'bg-white border-danger text-danger hover:bg-danger-light shadow-card',
    ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 border-transparent',
  };

  const sizes = {
    sm: iconOnly ? 'w-8 h-8' : 'h-8 px-3 text-sm',
    md: iconOnly ? 'w-11 h-11' : 'h-11 px-4 text-base',
    lg: iconOnly ? 'w-14 h-14' : 'h-14 px-6 text-lg',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg border transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none gap-2',
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
        <Loader2 className={cn(size === 'sm' ? 'w-4 h-4' : 'w-5 h-5', 'animate-spin')} />
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
