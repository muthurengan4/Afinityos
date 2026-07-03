'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, Rocket, ShieldAlert, Settings, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import Link from 'next/link';

/**
 * A "Command Center" tile that launches an SSO session into an external
 * connector-backed app. Renders differently depending on config state.
 *
 * Props:
 *   - connectorId: 'sales' | 'marketing' | 'support' | 'rewards' | 'insurance'
 *   - name: display label
 *   - description: short blurb
 *   - icon: lucide icon component
 *   - accent: 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' (tailwind color)
 *   - status: { canLaunch, configured, baseUrl, missing[] } from /api/sso/status
 *   - returnPath: path on the target app to land on (default '/')
 */
export function SsoLaunchTile({ connectorId, name, description, icon: Icon = Rocket, accent = 'violet', status, returnPath = '/' }) {
  const { authFetch, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const allowed = ['super_admin', 'org_admin', 'executive'].includes(user?.role);
  const canLaunch = status?.canLaunch;

  const accentBg = {
    violet: 'from-violet-500 to-fuchsia-500',
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500',
  }[accent] || 'from-violet-500 to-fuchsia-500';

  const launch = async () => {
    if (!allowed) return toast.error('Only Admins or Executives can launch this dashboard.');
    if (!canLaunch) return toast.error('Not configured. Add service credentials on the Connectors page.');
    setLoading(true);
    try {
      const res = await authFetch('/api/sso/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId, returnPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Launch failed');
      // Open in a new tab. The fragment carries the JWT.
      window.open(data.launchUrl, '_blank', 'noopener,noreferrer');
      toast.success(`Opened ${data.connectorName} in a new tab.`);
      setDetail(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="glass hover:border-primary/40 transition h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${accentBg} flex items-center justify-center text-white shadow-lg`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">{name}</CardTitle>
                <CardDescription className="text-[11px]">{description}</CardDescription>
              </div>
            </div>
            {canLaunch ? (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 text-[10px]">SSO ready</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 text-[10px]">Not configured</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 mt-auto space-y-2">
          {status?.baseUrl && (
            <p className="text-[10px] font-mono text-muted-foreground truncate">{status.baseUrl}</p>
          )}
          {!allowed ? (
            <Button size="sm" disabled variant="outline" className="w-full">
              <ShieldAlert className="h-4 w-4 mr-2" /> Admin / Executive only
            </Button>
          ) : canLaunch ? (
            <Button
              size="sm"
              onClick={launch}
              disabled={loading}
              className={`w-full bg-gradient-to-r ${accentBg} text-white shadow-lg`}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              Open {name}
            </Button>
          ) : (
            <Button size="sm" variant="outline" asChild className="w-full">
              <Link href="/connectors"><Settings className="h-4 w-4 mr-2" /> Configure connector</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> {detail?.connectorName} launched</DialogTitle>
            <DialogDescription>
              A new tab was opened at {detail?.baseUrl} with a pre-authenticated session
              (JWT delivered in URL fragment). Token expires in ~10 minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 rounded-lg border bg-muted/40 text-xs space-y-2">
            <p className="font-semibold">Didn&apos;t auto-login?</p>
            <p className="text-muted-foreground">
              Your target app needs the AfinityOS SSO receiver snippet loaded. Add
              &nbsp;<code className="bg-background px-1 rounded">&lt;script src=&quot;/sso-receiver.js&quot;&gt;&lt;/script&gt;</code>&nbsp;
              to your target app&apos;s <code>&lt;head&gt;</code>, or paste the contents of
              <a href="/sso-receiver.js" target="_blank" rel="noreferrer" className="text-primary underline mx-1">/sso-receiver.js</a>
              into your root layout.
            </p>
            <Button size="sm" variant="outline" onClick={() => {
              navigator.clipboard?.writeText(detail?.launchUrl || '');
              toast.success('Launch URL copied');
            }}>
              <Copy className="h-3 w-3 mr-1" /> Copy launch URL
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
