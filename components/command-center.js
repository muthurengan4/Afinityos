'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Megaphone, Headphones, Gift, Shield, ShieldCheck, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SsoLaunchTile } from '@/components/sso-launch-tile';
import { useAuth } from '@/lib/auth-context';

const CONNECTOR_UI = {
  sales: { name: 'AI Sales Dashboard', description: 'Pipelines, leads, deals, forecasts', icon: TrendingUp, accent: 'blue' },
  marketing: { name: 'Marketing Command', description: 'Campaigns, audiences, content, WhatsApp', icon: Megaphone, accent: 'emerald' },
  support: { name: 'Support Console', description: 'Tickets, KB, SLA, conversations', icon: Headphones, accent: 'violet' },
  rewards: { name: 'Rewards & Loyalty', description: 'Points, redemptions, referrals', icon: Gift, accent: 'amber' },
  insurance: { name: 'Insurance Platform', description: 'Quotes, policies, claims', icon: Shield, accent: 'rose' },
};

/**
 * Renders a grid of SSO launch tiles for the current org.
 * Only admins/super_admins/executives see actionable buttons; other roles see
 * disabled cards. Data comes from GET /api/sso/status.
 *
 * Props:
 *   - connectors: array of connector IDs to show. Default: all 5.
 *   - title: section heading. Default: "Command Center".
 *   - subtitle: section description.
 */
export function CommandCenter({ connectors = ['sales', 'marketing', 'support', 'rewards', 'insurance'], title = 'Command Center', subtitle }) {
  const { authFetch, user } = useAuth();
  const [statusMap, setStatusMap] = useState({});
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authFetch('/api/sso/status');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setAllowed(data.allowed);
        setStatusMap(Object.fromEntries((data.connectors || []).map((c) => [c.connectorId, c])));
      } catch { /* silent */ }
    })();
    return () => { mounted = false; };
  }, [authFetch]);

  const isRoleGated = !['super_admin', 'org_admin', 'executive'].includes(user?.role);

  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
      <Card className="glass">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>
              {subtitle || 'Launch a pre-authenticated session into any connected system. No re-login required.'}
            </CardDescription>
          </div>
          {isRoleGated ? (
            <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">
              <Info className="h-3 w-3 mr-1" /> View-only for your role
            </Badge>
          ) : (
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              <ShieldCheck className="h-3 w-3 mr-1" /> {user?.role.replace('_', ' ')}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {connectors.map((cid) => {
              const meta = CONNECTOR_UI[cid] || { name: cid, description: 'External system', icon: TrendingUp, accent: 'violet' };
              return (
                <SsoLaunchTile
                  key={cid}
                  connectorId={cid}
                  name={meta.name}
                  description={meta.description}
                  icon={meta.icon}
                  accent={meta.accent}
                  status={statusMap[cid]}
                  returnPath="/"
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.section>
  );
}
