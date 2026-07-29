'use client';

import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const toggleGroupVariants = cva('flex items-center gap-1');

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleGroupVariants>
>(({ className, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleGroupVariants(), className)} {...props} />
));
ToggleGroup.displayName = TogglePrimitive.Root.displayName;

export { ToggleGroup };