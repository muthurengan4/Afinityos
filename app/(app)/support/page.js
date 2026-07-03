'use client';

import { LifeBuoy, Plus, Filter, Inbox, Clock, CheckCircle2, ThumbsUp } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CommandCenter } from '@/components/command-center';

const tickets = [
  { id: 'T-10428', subject: 'SAML SSO not redirecting', requester: 'Maya P.', priority: 'High', status: 'Open', age: '14m' },
  { id: 'T-10427', subject: 'How do I export Customer360?', requester: 'Owen K.', priority: 'Low', status: 'Open', age: '1h' },
  { id: 'T-10426', subject: 'Billing invoice discrepancy', requester: 'Ari S.', priority: 'Medium', status: 'Pending', age: '3h' },
  { id: 'T-10425', subject: 'AI agent skipped 2 emails', requester: 'Lena G.', priority: 'High', status: 'Open', age: '5h' },
  { id: 'T-10424', subject: 'Bulk import failed', requester: 'Diego T.', priority: 'Medium', status: 'Resolved', age: '1d' },
];

export default function SupportPage() {
  return (
    <div>
      <PageHeader
        title="Support"
        description="Omnichannel support with AI co-pilot — every ticket, every channel, one queue."
        icon={LifeBuoy}
        accent="amber"
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> New ticket</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open tickets" value="148" delta="-12" icon={Inbox} accent="amber" index={0} />
        <StatCard label="Avg first response" value="3.4m" delta="-32%" icon={Clock} accent="violet" index={1} />
        <StatCard label="Resolved today" value="284" delta="+18%" icon={CheckCircle2} accent="emerald" index={2} />
        <StatCard label="CSAT" value="96%" delta="+2pts" icon={ThumbsUp} accent="blue" index={3} />
      </div>

      <CommandCenter
        connectors={['support']}
        title="Open the Support Console"
        subtitle="Admins, Org Admins, and Executives can open the connected Support system with a single click — no re-login required."
      />

      <Card className="glass">
        <CardHeader><CardTitle>Queue</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center gap-4 p-4 hover:bg-accent/40 transition">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-gradient-to-br from-amber-500 to-orange-500 text-white">{t.requester.split(' ').map((p) => p[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">{t.id} • {t.requester} • {t.age} ago</p>
                </div>
                <Badge variant="outline" className={t.priority === 'High' ? 'text-rose-500 border-rose-500/30' : ''}>{t.priority}</Badge>
                <Badge variant="outline" className={t.status === 'Resolved' ? 'text-emerald-500 border-emerald-500/30' : ''}>{t.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
