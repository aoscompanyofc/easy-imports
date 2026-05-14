import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Skeleton } from './Skeleton';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function Table<T extends { id: string | number }>({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyMessage = 'Nenhum dado encontrado.',
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton height={40} className="w-full" />
        <Skeleton height={200} className="w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center bg-white border border-neutral-200 rounded-xl">
        <p className="text-neutral-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-white border border-neutral-200 rounded-xl shadow-card overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200">
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  'px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'transition-colors',
                onRowClick ? 'cursor-pointer hover:bg-neutral-50' : ''
              )}
            >
              {columns.map((column, index) => (
                <td
                  key={index}
                  className={cn('px-6 py-4 text-sm text-neutral-700', column.className)}
                >
                  {typeof column.accessor === 'function'
                    ? column.accessor(item)
                    : (item[column.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
