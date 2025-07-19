'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import type { VariantProps } from 'class-variance-authority';
import type { buttonVariants } from '@/components/ui/button';


interface NavLinkProps extends React.ComponentProps<typeof Link> {
  icon?: LucideIcon;
  children: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>['variant'];
  size?: VariantProps<typeof buttonVariants>['size'];
  tooltip?: string;
}

export function NavLink({ href, icon: Icon, children, variant, size, tooltip, ...props }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <SidebarMenuButton
      asChild
      isActive={isActive}
      variant={variant || "default"}
      size={size || "default"}
      tooltip={tooltip}
      className="justify-start"
    >
      <Link href={href} {...props}>
        {Icon && <Icon />}
        <span>{children}</span>
      </Link>
    </SidebarMenuButton>
  );
}
