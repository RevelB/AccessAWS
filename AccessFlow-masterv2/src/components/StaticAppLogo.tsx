
'use client';

import { Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StaticAppLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2", // Removed px-2 as it might be handled by parent
        className
      )}
    >
      <Workflow className="h-7 w-7 text-primary flex-shrink-0" />
      <span className="text-lg font-semibold text-foreground">
        AccessFlow
      </span>
    </div>
  );
}
