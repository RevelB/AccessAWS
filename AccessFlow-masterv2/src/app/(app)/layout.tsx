
'use client';

import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Initialize the inactivity timeout hook.
  // This will be active for the entire authenticated part of the application.
  useInactivityTimeout();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // This state should ideally be brief as useEffect handles redirection.
    // You could show a minimal loading/redirecting message or null.
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
