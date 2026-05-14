import React from 'react';
import { Card } from '../ui/Card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: keyof typeof LucideIcons;
  iconBgColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  subtitle,
  icon,
  iconBgColor = 'bg-primary-50',
}) => {
  const IconComponent = LucideIcons[icon] as React.ElementType;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-neutral-500">{title}</span>
        <div className={cn('p-2.5 rounded-lg text-neutral-900', iconBgColor)}>
          {IconComponent && <IconComponent className="w-5 h-5" />}
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="text-3xl font-bold text-neutral-900">{value}</h3>
        
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <span className={cn(
              'flex items-center text-xs font-bold',
              change >= 0 ? 'text-success' : 'text-danger'
            )}>
              {change >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
              )}
              {Math.abs(change)}%
            </span>
          )}
          
          {subtitle && (
            <span className="text-xs text-neutral-400 font-medium">{subtitle}</span>
          )}
          
          {change !== undefined && (
            <span className="text-xs text-neutral-400 font-medium">vs mês anterior</span>
          )}
        </div>
      </div>
    </Card>
  );
};
