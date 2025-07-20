
'use client';

import { PlusCircle, ListChecks, Archive, BarChart3, Power, User, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { AppLogo } from '@/components/AppLogo';
import { NavLink } from '@/components/NavLink';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarInset,
  SidebarFooter,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

const getHeaderTitle = (pathname: string): string => {
  if (pathname === '/dashboard/open') return 'Open Jobs';
  if (pathname === '/dashboard/finished') return 'Finished Jobs';
  if (pathname === '/jobs/new') return 'New Job';
  if (pathname.startsWith('/jobs/') && pathname !== '/jobs/new') return 'Edit Job';
  if (pathname === '/reporting') return 'Reporting';
  if (pathname === '/deleted-jobs') return 'Deleted Jobs';
  if (pathname.startsWith('/profile')) return 'User Profile';
  return 'AccessFlow Dashboard';
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();
  const { toast } = useToast();

  const headerTitle = getHeaderTitle(pathname);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
    } catch (error) {
      console.error('Logout failed:', error);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <AppLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <NavLink href="/dashboard/open" icon={ListChecks} tooltip="Open Jobs">
                Open Jobs
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink href="/jobs/new" icon={PlusCircle} tooltip="Add New Job">
                Add New Job
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink href="/dashboard/finished" icon={Archive} tooltip="Finished Jobs">
                Finished Jobs
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
               <NavLink href="/reporting" icon={BarChart3} tooltip="Reporting">
                Reporting
              </NavLink>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <NavLink href="/deleted-jobs" icon={Trash2} tooltip="Deleted Jobs">
                Deleted Jobs
              </NavLink>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          {user && (
             <SidebarMenu>
               <SidebarMenuItem>
                <NavLink href="/profile" icon={User} tooltip="User Profile">
                  User Profile
                </NavLink>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Log Out">
                  <Power />
                  <span>Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* This inserts the content into the main page */}
      <SidebarInset>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-0 border-b bg-background/80 backdrop-blur-sm h-8 sm:h-10 px-4 sm:px-6">
          <h1 className="text-lg font-semibold md:text-xl font-headline">{headerTitle}</h1>
          <div>
            <Image src="/XRLogo.png" alt="XR Logo" width={97} height={36} priority />
          </div>
        </header>
        <main className="flex-1 p-1 sm:p-3">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
