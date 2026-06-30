'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { roleLabels } from '@/lib/nav-config';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invites/${token}`)
      .then(async (r) => {
        if (!r.ok) { setError((await r.json()).error || 'Invite not found'); return; }
        setData(await r.json());
      })
      .catch(() => setError('Failed to load invite'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AuthShell title="You’ve been invited" subtitle="Join your team’s AfinityOS workspace.">
      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading invitation…</div>}
      {error && (
        <div className="space-y-4">
          <Card className="glass border-rose-500/30"><CardContent className="p-4 text-sm text-rose-500">{error}</CardContent></Card>
          <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Link href="/login">Go to sign in</Link></Button>
        </div>
      )}
      {data && data.invite.status !== 'pending' && (
        <div className="space-y-4">
          <Card className="glass"><CardContent className="p-4 text-sm">This invitation has already been {data.invite.status}.</CardContent></Card>
          <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Link href="/login">Go to sign in</Link></Button>
        </div>
      )}
      {data && data.invite.status === 'pending' && (
        <div className="space-y-5">
          <Card className="glass">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                  {data.organization?.logoUrl && <AvatarImage src={data.organization.logoUrl} />}
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-lg">{(data.organization?.name || 'O')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Join organization</p>
                  <h3 className="text-xl font-bold">{data.organization?.name}</h3>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Invited email</span><span className="font-medium">{data.invite.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Role</span><Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30">{roleLabels[data.invite.role] || data.invite.role}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Invited by</span><span className="font-medium">{data.invite.createdByName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span className="font-medium">{new Date(data.invite.expiresAt).toLocaleDateString()}</span></div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
            <p className="text-xs text-muted-foreground">By accepting, you’ll be added to <span className="font-medium text-foreground">{data.organization?.name}</span> as a <span className="font-medium text-foreground">{roleLabels[data.invite.role]}</span>. Data in this workspace is isolated from other organizations.</p>
          </div>

          <Button onClick={() => router.push(`/register?invite=${token}&email=${encodeURIComponent(data.invite.email)}`)} className="w-full h-10 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
            Accept and create account <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-center text-xs text-muted-foreground">Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link></p>
        </div>
      )}
    </AuthShell>
  );
}
