
'use client';

import { Workflow } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function AppLogo() {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={cn(
        "flex items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center",
        "bg-transparent border-none text-inherit cursor-pointer w-full" // Ensure it behaves like the div and is clickable
      )}
      aria-label="Toggle sidebar"
    >
      <Workflow className="h-7 w-7 text-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6 flex-shrink-0" />
      <span className="text-lg font-semibold text-foreground group-data-[collapsible=icon]:hidden">
        AccessFlow
      </span>
    </button>
  );
}
