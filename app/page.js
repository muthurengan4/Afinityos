'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppLogo } from '@/components/app-logo';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [loading, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center radial-glow">
      <AppLogo size={56} />
      <p className="mt-6 text-xs text-muted-foreground tracking-widest uppercase">Loading AfinityOS</p>
    </div>
  );
}
