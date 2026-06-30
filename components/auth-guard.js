'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLogo } from './app-logo';

export function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const redirect = encodeURIComponent(pathname || '/dashboard');
      router.replace(`/login?next=${redirect}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 radial-glow">
        <AppLogo size={48} />
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
        </div>
        <p className="text-xs text-muted-foreground tracking-widest uppercase">Loading workspace</p>
      </div>
    );
  }

  return children;
}
