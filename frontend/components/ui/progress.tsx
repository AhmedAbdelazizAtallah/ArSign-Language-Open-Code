'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

function Progress({
  className,
  value,
  max = 100,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
  max?: number;
}) {
  const percentage = Math.min(Math.max((value || 0) / max * 100, 0), 100);

  return (
    <div
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-surface-elevated border border-border', className)}
      {...props}
    >
      <div
        className="h-full bg-primary-600 transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export { Progress };