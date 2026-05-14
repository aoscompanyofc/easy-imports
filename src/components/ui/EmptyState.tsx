import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof LucideIcons;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = 'Inbox',
  action,
}) => {
  const IconComponent = LucideIcons[icon] as React.ElementType;

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border-2 border-dashed border-neutral-200 rounded-2xl">
      <div className="p-4 bg-neutral-50 rounded-full text-neutral-400 mb-4">
        {IconComponent && <IconComponent size={40} />}
      </div>
      <h3 className="text-lg font-bold text-neutral-900 mb-2">{title}</h3>
      <p className="text-sm text-neutral-500 max-w-xs mb-6">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
