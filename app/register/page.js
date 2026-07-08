'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';
import { roleLabels } from '@/lib/nav-config';

function RegisterContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const inviteToken = sp.get('invite');
  const emailFromInvite = sp.get('email');
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: emailFromInvite || '',
    password: '',
    orgName: '',
    role: 'org_admin',
  });
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState(null);

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/invites/${inviteToken}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) { setInviteError(d.error || 'Invalid invite'); return; }
        if (d.invite.status !== 'pending') { setInviteError(`Invite already ${d.invite.status}`); return; }
        setInvite(d);
        setForm((f) => ({ ...f, email: d.invite.email, role: d.invite.role }));
      })
      .catch(() => setInviteError('Failed to load invite'));
  }, [inviteToken]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({ ...form, ...(inviteToken ? { inviteToken } : {}) });
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
    <AuthShell
      title={invite ? `Join ${invite.organization?.name}` : 'Create your workspace'}
      subtitle={invite ? `You were invited as a ${roleLabels[invite.invite.role]}.` : 'Set up your enterprise workspace in under a minute.'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {invite && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <Mail className="h-4 w-4 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium">{invite.organization?.name}</p>
              <p className="text-xs text-muted-foreground">Invited as <Badge variant="outline" className="text-[10px] ml-1">{roleLabels[invite.invite.role]}</Badge></p>
            </div>
          </div>
        )}
        {inviteError && <p className="text-sm text-rose-500">{inviteError}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" value={form.name} onChange={set('name')} placeholder="Jane Doe" required /></div>
          {!invite && <div className="space-y-2"><Label htmlFor="orgName">Company</Label><Input id="orgName" value={form.orgName} onChange={set('orgName')} placeholder="Acme Inc." required /></div>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" value={form.email} onChange={set('email')} placeholder="jane@acme.com" required disabled={!!invite} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" required minLength={8} />
        </div>
        {!invite && (
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
        )}
        <Button type="submit" disabled={loading} className="w-full h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {invite ? 'Accept invite & create account' : 'Create workspace'}
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">By creating an account, you agree to our Terms & Privacy.</p>
        <p className="text-center text-xs text-muted-foreground">
          Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}

