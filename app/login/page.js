'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, ChromeIcon, Github, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/dashboard';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.replace(next);
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Sign in to AfinityOS" subtitle="Enter your enterprise credentials to continue">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="h-10"><ChromeIcon className="h-4 w-4 mr-2" /> Google SSO</Button>
          <Button type="button" variant="outline" className="h-10"><Github className="h-4 w-4 mr-2" /> GitHub SSO</Button>
        </div>
        <Button type="button" variant="outline" className="w-full h-10"><KeyRound className="h-4 w-4 mr-2" /> SAML / Okta SSO</Button>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-[10px] uppercase tracking-widest text-muted-foreground">or with email</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
          </div>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="remember" defaultChecked />
          <Label htmlFor="remember" className="text-xs text-muted-foreground font-normal">Keep me signed in on this device</Label>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Sign in
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">Create one</Link>
        </p>
      </form>
    </AuthShell>
  );
}
