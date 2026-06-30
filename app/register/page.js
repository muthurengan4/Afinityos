'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '', role: 'org_admin' });
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Welcome to AfinityOS!');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });

  return (
    <AuthShell title="Create your workspace" subtitle="Set up your enterprise workspace in under a minute.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} onChange={set('name')} placeholder="Jane Doe" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgName">Company</Label>
            <Input id="orgName" value={form.orgName} onChange={set('orgName')} placeholder="Acme Inc." required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="jane@acme.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" required minLength={8} />
        </div>
        <div className="space-y-2">
          <Label>Your role</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="org_admin">Organization Admin</SelectItem>
              <SelectItem value="executive">Executive</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="standard_user">Standard User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create workspace
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">By creating an account, you agree to our Terms & Privacy.</p>
        <p className="text-center text-xs text-muted-foreground">
          Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
