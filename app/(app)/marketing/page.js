'use client';

import { Megaphone, Plus, Sparkles, Send, Eye, MousePointerClick, Users, Zap } from 'lucide-react';
import { PageHeader, StatCard, FeatureCard } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CommandCenter } from '@/components/command-center';

const campaigns = [
  { name: 'Expansion-EU Q3', channel: 'LinkedIn + Email', status: 'Live', open: 42, ctr: 8.4, sent: '24,000' },
  { name: 'Renewal Nudge', channel: 'Email', status: 'Live', open: 58, ctr: 12.2, sent: '8,400' },
  { name: 'AI Workforce Launch', channel: 'Multi-channel', status: 'Scheduled', open: 0, ctr: 0, sent: '0' },
];

export default function MarketingPage() {
  return (
    <div>
      <PageHeader
        title="Marketing"
        description="AI-orchestrated campaigns across every channel — from first touch to closed-won."
        icon={Megaphone}
        accent="rose"
        actions={
          <>
            <Button variant="outline" size="sm"><Sparkles className="h-4 w-4 mr-2" /> Generate campaign</Button>
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> New campaign</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Emails sent (30d)" value="284k" delta="+12%" icon={Send} accent="rose" index={0} />
        <StatCard label="Avg open rate" value="48%" delta="+6pts" icon={Eye} accent="violet" index={1} />
        <StatCard label="Avg CTR" value="9.2%" delta="+1.4pts" icon={MousePointerClick} accent="blue" index={2} />
        <StatCard label="MQLs generated" value="1,840" delta="+24%" icon={Users} accent="emerald" index={3} />
      </div>

      <CommandCenter
        connectors={['marketing']}
        title="Open the Marketing Command"
        subtitle="Admins, Org Admins, and Executives can jump straight into the connected Marketing system — pre-authenticated."
      />

      <Card className="glass mb-6">
        <CardHeader><CardTitle>Active campaigns</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {campaigns.map((c) => (
            <div key={c.name} className="flex items-center gap-4 p-3 rounded-lg border bg-card/40">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/10 flex items-center justify-center">
                <Megaphone className="h-4 w-4 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{c.name}</p>
                  <Badge variant="outline" className={c.status === 'Live' ? 'text-emerald-500 border-emerald-500/30' : ''}>{c.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{c.channel} • {c.sent} sent</p>
              </div>
              <div className="hidden sm:block w-32">
                <p className="text-[10px] text-muted-foreground mb-1">Open rate</p>
                <Progress value={c.open} className="h-1.5" />
              </div>
              <div className="hidden md:block w-32">
                <p className="text-[10px] text-muted-foreground mb-1">CTR</p>
                <Progress value={c.ctr * 5} className="h-1.5" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard icon={Zap} title="AI copy studio" description="Generate on-brand emails, ads and landing pages in seconds." badge="AI" index={0} />
        <FeatureCard icon={Users} title="Audience builder" description="Hyper-segment using behavioral and firmographic signals." index={1} />
        <FeatureCard icon={Send} title="Multi-channel send" description="Email, SMS, LinkedIn and webhooks from one workflow." index={2} />
      </div>
    </div>
  );
}
