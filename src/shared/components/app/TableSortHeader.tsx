import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableSortHeaderProps {
  label: string;
  active?: boolean;
  direction?: 'asc' | 'desc';
  onClick?: () => void;
  className?: string;
}

export function TableSortHeader({ label, active = false, direction = 'asc', onClick, className }: TableSortHeaderProps) {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-foreground',
        onClick ? 'cursor-pointer' : 'cursor-default',
        className
      )}
    >
      <span>{label}</span>
      <Icon className={cn('h-3.5 w-3.5', active ? 'opacity-100' : 'opacity-70')} />
    </button>
  );
}
