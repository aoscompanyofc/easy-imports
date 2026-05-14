import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  className,
  width,
  height,
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-200',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded h-4 w-full',
        variant === 'rectangular' && 'rounded-lg',
        className
      )}
      style={{ width, height }}
    />
  );
};
