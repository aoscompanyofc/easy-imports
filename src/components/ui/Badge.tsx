import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  leftIcon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  leftIcon,
  className,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary-50 text-primary-900',
    success: 'bg-success-light text-success',
    danger: 'bg-danger-light text-danger',
    warning: 'bg-warning-light text-warning',
    info: 'bg-info-light text-info',
    neutral: 'bg-neutral-100 text-neutral-600',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full gap-1',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {leftIcon && <span>{leftIcon}</span>}
      {children}
    </span>
  );
};
