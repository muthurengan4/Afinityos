'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Bot, PhoneIncoming, PhoneOutgoing, PlayCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

function fmtDuration(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, '0')}s`;
}

const sentimentColor = {
  positive: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10',
  neutral: 'text-blue-500 border-blue-500/30 bg-blue-500/10',
  negative: 'text-rose-500 border-rose-500/30 bg-rose-500/10',
};

export function CustomerCalls({ calls = [], loading }) {
  const [open, setOpen] = useState(null);
  const voiceCalls = calls.filter((c) => c.type === 'voice');
  const aiCalls = calls.filter((c) => c.type === 'ai');

  const renderList = (list, kind) => {
    if (list.length === 0) return <p className="text-sm text-muted-foreground px-6 py-4">No {kind} calls yet.</p>;
    return (
      <div className="divide-y">
        {list.map((c) => {
          const Icon = c.type === 'ai' ? Bot : Phone;
          const Dir = c.direction === 'Inbound' ? PhoneIncoming : PhoneOutgoing;
          return (
            <div key={c.id} className="px-6 py-4 flex items-start gap-4">
              <div className={`h-10 w-10 rounded-lg ${c.type === 'ai' ? 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/30' : 'bg-blue-500/10 text-blue-500 border-blue-500/30'} border flex items-center justify-center`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{c.agent}</p>
                  <Badge variant="outline" className="text-[10px]"><Dir className="h-3 w-3 mr-1" />{c.direction}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${sentimentColor[c.sentiment]}`}><Sparkles className="h-3 w-3 mr-1" />{c.sentiment}</Badge>
                  <span className="text-[11px] text-muted-foreground">• {fmtDuration(c.durationSec)}</span>
                  <span className="text-[11px] text-muted-foreground">• {new Date(c.occurredAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{c.summary}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOpen(c)}><PlayCircle className="h-4 w-4 mr-1" /> View</Button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="h-4 w-4" /> Voice & AI calls</CardTitle>
          <CardDescription>All conversations with this customer</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <p className="px-6 pb-6 text-sm text-muted-foreground">Loading…</p>}
          {!loading && (
            <div className="space-y-2">
              <div className="px-6 pt-2 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">AI calls • {aiCalls.length}</div>
              {renderList(aiCalls, 'AI')}
              <div className="px-6 pt-3 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Voice calls • {voiceCalls.length}</div>
              {renderList(voiceCalls, 'voice')}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {open?.type === 'ai' ? <Bot className="h-5 w-5 text-fuchsia-500" /> : <Phone className="h-5 w-5 text-blue-500" />}
              {open?.agent}
            </DialogTitle>
            <DialogDescription>
              {open && (<>{open.direction} • {fmtDuration(open.durationSec)} • {new Date(open.occurredAt).toLocaleString()}</>)}
            </DialogDescription>
          </DialogHeader>
          {open && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-primary/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI summary</p>
                <p className="text-sm">{open.summary}</p>
              </div>
              {open.transcript && open.transcript.length > 0 ? (
                <ScrollArea className="h-64 rounded-lg border p-3">
                  <div className="space-y-3">
                    {open.transcript.map((t, i) => (
                      <div key={i} className="flex gap-3">
                        <Badge variant="outline" className="text-[10px] h-5 shrink-0">{t.speaker}</Badge>
                        <p className="text-sm">{t.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">Transcript not available for this call.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
