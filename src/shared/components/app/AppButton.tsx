import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * App-wide button defaults; extend shadcn Button only—no raw CSS.
 */
const AppButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = 'default', ...props }, ref) => (
    <Button ref={ref} size={size} className={cn(className)} {...props} />
  )
);
AppButton.displayName = 'AppButton';

export { AppButton };
