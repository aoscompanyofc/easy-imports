import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = 'right',
  size = 'md',
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: side === 'bottom' ? 'h-[30vh]' : 'w-[300px]',
    md: side === 'bottom' ? 'h-[50vh]' : 'w-[400px]',
    lg: side === 'bottom' ? 'h-[80vh]' : 'w-[600px]',
    full: 'w-full h-full',
  };

  const placements = {
    right: 'top-0 bottom-0 right-0 slide-in-from-right',
    left: 'top-0 bottom-0 left-0 slide-in-from-left',
    bottom: 'bottom-0 left-0 right-0 slide-in-from-bottom rounded-t-2xl',
  };

  return (
    <div className="fixed inset-0 z-[100]">
      <div 
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div 
        className={cn(
          'absolute bg-white shadow-2xl flex flex-col animate-in duration-300',
          placements[side],
          sizes[size],
          side !== 'bottom' && 'h-full'
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
