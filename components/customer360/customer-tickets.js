'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LifeBuoy, Ticket } from 'lucide-react';

export function CustomerTickets({ tickets = [], loading }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><LifeBuoy className="h-4 w-4" /> Support tickets</CardTitle>
        <CardDescription>Recent support history across channels</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading && <p className="px-6 pb-6 text-sm text-muted-foreground">Loading…</p>}
        {!loading && tickets.length === 0 && <p className="px-6 pb-6 text-sm text-muted-foreground">No tickets filed by this customer.</p>}
        <div className="divide-y">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground">{t.ref} • {t.channel} • {t.agent} • {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={t.priority === 'High' ? 'text-rose-500 border-rose-500/30' : ''}>{t.priority}</Badge>
                <Badge variant="outline" className={t.status === 'Resolved' ? 'text-emerald-500 border-emerald-500/30' : ''}>{t.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
