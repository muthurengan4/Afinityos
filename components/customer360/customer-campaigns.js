'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Eye, MousePointerClick, CheckCircle2 } from 'lucide-react';

export function CustomerCampaigns({ campaigns = [], loading }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Campaign history</CardTitle>
        <CardDescription>Marketing journeys this customer is part of</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading && <p className="px-6 pb-6 text-sm text-muted-foreground">Loading…</p>}
        {!loading && campaigns.length === 0 && <p className="px-6 pb-6 text-sm text-muted-foreground">No campaign exposure recorded.</p>}
        <div className="divide-y">
          {campaigns.map((c) => (
            <div key={c.id} className="px-6 py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.campaignName}</p>
                  <p className="text-xs text-muted-foreground">{c.channel} • {new Date(c.occurredAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline" className={c.status === 'Live' ? 'text-emerald-500 border-emerald-500/30' : ''}>{c.status}</Badge>
              </div>
              <div className="flex items-center gap-5 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Megaphone className="h-3 w-3" /> {c.sent} sent</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {c.opened} opened</span>
                <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {c.clicked} clicked</span>
                <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> {c.converted} converted</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
