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
import { Loader2, ChromeIcon, Github, Sparkles, Wand2 } from 'lucide-react';

const DEMO_EMAIL = 'demo@afinityos.app';
const DEMO_PASSWORD = 'Demo@123';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/dashboard';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

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

  const demoSignIn = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo sign-in failed');
      // Persist tokens via the auth context's storage keys
      localStorage.setItem('afinity_access_token', data.accessToken);
      localStorage.setItem('afinity_refresh_token', data.refreshToken);
      localStorage.setItem('afinity_user', JSON.stringify(data.user));
      if (data.organization) localStorage.setItem('afinity_org', JSON.stringify(data.organization));
      toast.success('Signed in to demo workspace');
      window.location.href = next;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  const fillDemo = () => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); };

  return (
    <AuthShell title="Sign in to AfinityOS" subtitle="Enter your enterprise credentials to continue">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Demo workspace one-click */}
        <Button
          type="button"
          onClick={demoSignIn}
          disabled={demoLoading}
          className="w-full h-11 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:opacity-90 text-white relative overflow-hidden"
        >
          {demoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Try the AfinityOS demo workspace
        </Button>
        <p className="text-[11px] text-muted-foreground text-center -mt-2">One click — no signup. Pre-loaded with 6 demo customers, events, modules.</p>

        <div className="relative my-2">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-[10px] uppercase tracking-widest text-muted-foreground">or</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" className="h-10" disabled><ChromeIcon className="h-4 w-4 mr-2" /> Google SSO</Button>
          <Button type="button" variant="outline" className="h-10" disabled><Github className="h-4 w-4 mr-2" /> GitHub SSO</Button>
        </div>

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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox id="remember" defaultChecked />
            <Label htmlFor="remember" className="text-xs text-muted-foreground font-normal">Keep me signed in</Label>
          </div>
          <button type="button" onClick={fillDemo} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Fill demo credentials
          </button>
        </div>

        <Button type="submit" disabled={loading} className="w-full h-10 bg-foreground text-background hover:opacity-90">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
