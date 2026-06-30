'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setDone(true);
      toast.success('Check your inbox for reset instructions.');
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={done ? 'Check your email' : 'Reset your password'}
      subtitle={done ? `We've sent a reset link to ${email}. The link expires in 60 minutes.` : 'Enter your work email and we will send you a secure reset link.'}
    >
      {done ? (
        <div className="space-y-4">
          <div className="flex items-center justify-center h-24 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-primary/20">
            <MailCheck className="h-10 w-10 text-primary" />
          </div>
          <Button asChild className="w-full h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send reset link
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Remembered? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
