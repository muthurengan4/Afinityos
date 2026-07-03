'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Rocket, ShieldAlert, Settings, Copy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

/**
 * SSO launch tile — vertical card with a strong icon block, clear title,
 * status badge, and one primary action anchored to the bottom.
 * Uses next/navigation router.push (not <Link asChild>) so the click always fires.
 */
export function SsoLaunchTile({ connectorId, name, description, icon: Icon = Rocket, accent = 'violet', status, returnPath = '/' }) {
  const { authFetch, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);

  const allowed = ['super_admin', 'org_admin', 'executive'].includes(user?.role);
  const canLaunch = status?.canLaunch;

  const accentBg = {
    violet:  { grad: 'from-violet-500 to-fuchsia-500',  tint: 'from-violet-500/20 to-fuchsia-500/10', ring: 'ring-violet-500/30' },
    blue:    { grad: 'from-blue-500 to-cyan-500',       tint: 'from-blue-500/20 to-cyan-500/10',      ring: 'ring-blue-500/30' },
    emerald: { grad: 'from-emerald-500 to-teal-500',    tint: 'from-emerald-500/20 to-teal-500/10',   ring: 'ring-emerald-500/30' },
    amber:   { grad: 'from-amber-500 to-orange-500',    tint: 'from-amber-500/20 to-orange-500/10',   ring: 'ring-amber-500/30' },
    rose:    { grad: 'from-rose-500 to-pink-500',       tint: 'from-rose-500/20 to-pink-500/10',      ring: 'ring-rose-500/30' },
  }[accent] || { grad: 'from-violet-500 to-fuchsia-500', tint: 'from-violet-500/20 to-fuchsia-500/10', ring: 'ring-violet-500/30' };

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
      window.open(data.launchUrl, '_blank', 'noopener,noreferrer');
      toast.success(`Opened ${data.connectorName} in a new tab.`);
      setDetail(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const goConfigure = () => router.push(`/connectors?connector=${connectorId}`);

  return (
    <>
      <Card className="glass relative overflow-hidden flex flex-col h-full transition hover:border-primary/40 hover:shadow-xl hover:shadow-black/20">
        {/* soft accent gradient wash */}
        <div className={`absolute inset-0 bg-gradient-to-br ${accentBg.tint} opacity-60 pointer-events-none`} />

        <div className="relative p-5 flex flex-col h-full gap-4">
          {/* header row: icon + status badge */}
          <div className="flex items-start justify-between gap-3">
            <div className={`h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br ${accentBg.grad} flex items-center justify-center text-white shadow-lg ring-1 ${accentBg.ring}`}>
              <Icon className="h-6 w-6" strokeWidth={2.25} />
            </div>
            {canLaunch ? (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" /> SSO ready
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 shrink-0">
                Not configured
              </Badge>
            )}
          </div>

          {/* title + description block */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground leading-tight text-[15px]">{name}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
            {status?.baseUrl && (
              <p className="text-[10px] font-mono text-muted-foreground/70 mt-2 truncate" title={status.baseUrl}>
                {status.baseUrl.replace(/^https?:\/\//, '')}
              </p>
            )}
          </div>

          {/* action row anchored to bottom */}
          <div className="pt-1">
            {!allowed ? (
              <Button size="sm" disabled variant="outline" className="w-full h-9">
                <ShieldAlert className="h-4 w-4 mr-2" /> Admin only
              </Button>
            ) : canLaunch ? (
              <Button
                size="sm"
                onClick={launch}
                disabled={loading}
                className={`w-full h-9 bg-gradient-to-r ${accentBg.grad} text-white shadow-lg hover:opacity-95`}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Launching…</>
                ) : (
                  <>Open <ArrowRight className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={goConfigure} className="w-full h-9">
                <Settings className="h-4 w-4 mr-2" /> Configure
              </Button>
            )}
          </div>
        </div>
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
              The target app needs the AfinityOS SSO receiver snippet loaded. Add
              &nbsp;<code className="bg-background px-1 rounded">&lt;script src=&quot;/sso-receiver.js&quot;&gt;&lt;/script&gt;</code>&nbsp;
              to your target app&apos;s <code>&lt;head&gt;</code>, or copy the contents of
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
