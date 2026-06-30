'use client';

import { useEffect, useState } from 'react';
import { Activity, Filter, Sparkles, Loader2, RefreshCw, CheckCircle2, XCircle, Bot, User as UserIcon, Cog } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const EVENT_COLORS = {
  'customer.created': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  'lead.created': 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  'campaign.sent': 'bg-rose-500/10 text-rose-500 border-rose-500/30',
  'policy.purchased': 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  'ticket.opened': 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  'reward.issued': 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  'voice_call.completed': 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/30',
};

const ACTOR_ICONS = { user: UserIcon, ai: Bot, system: Cog };

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function EventsPage() {
  const { authFetch } = useAuth();
  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState([]);
  const [subscriptions, setSubscriptions] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [emitting, setEmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [eRes, tRes] = await Promise.all([
        authFetch(`/api/events${filter !== 'all' ? `?type=${filter}` : ''}`),
        authFetch('/api/events/types'),
      ]);
      if (eRes.ok) setEvents((await eRes.json()).events || []);
      if (tRes.ok) {
        const t = await tRes.json();
        setTypes(t.types || []);
        setSubscriptions(t.subscriptions || {});
      }
    } catch (e) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const emitSample = async (type) => {
    setEmitting(true);
    try {
      const res = await authFetch('/api/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload: { sample: true, generatedAt: new Date().toISOString() } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Emitted ${type} — ${data.event.listenersInvoked.length} listener(s) ran`);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setEmitting(false); }
  };

  const stats = {
    total: events.length,
    processed: events.filter((e) => e.processed).length,
    bySources: {},
  };
  for (const e of events) {
    stats.bySources[e.type] = (stats.bySources[e.type] || 0) + 1;
  }
  const topType = Object.entries(stats.bySources).sort(([, a], [, b]) => b - a)[0]?.[0] || '—';

  return (
    <div>
      <PageHeader
        title="Events"
        description="Every domain event captured by the AfinityOS event bus. Inspect history, listeners and outcomes."
        icon={Activity}
        accent="emerald"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
            <Select disabled={emitting} value="" onValueChange={(v) => v && emitSample(v)}>
              <SelectTrigger className="w-52 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-0"><SelectValue placeholder="✨ Emit sample event…" /></SelectTrigger>
              <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total events" value={stats.total.toLocaleString()} icon={Activity} accent="violet" index={0} />
        <StatCard label="Processed" value={stats.processed.toLocaleString()} icon={CheckCircle2} accent="emerald" index={1} />
        <StatCard label="Event types" value={types.length} icon={Sparkles} accent="blue" index={2} />
        <StatCard label="Top type" value={topType} icon={Filter} accent="amber" index={3} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="glass xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Event history</CardTitle><CardDescription>Most recent first — click any row for details + listener outcomes</CardDescription></div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All event types</SelectItem>
                {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading events…</div>
            ) : events.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex h-12 w-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 items-center justify-center mb-3"><Activity className="h-6 w-6 text-primary" /></div>
                <p className="font-semibold">No events yet</p>
                <p className="text-sm text-muted-foreground mt-1">Emit a sample event or create a customer to see the bus in action.</p>
              </div>
            ) : (
              <div className="divide-y">
                {events.map((e, i) => {
                  const ActorIcon = ACTOR_ICONS[e.actor?.type] || UserIcon;
                  const failures = (e.listenersInvoked || []).filter((l) => !l.success).length;
                  return (
                    <motion.button
                      key={e.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => setDetail(e)}
                      className="w-full text-left px-4 py-3 hover:bg-accent/40 transition flex items-start gap-3"
                    >
                      <Badge variant="outline" className={`text-[10px] font-mono h-5 shrink-0 ${EVENT_COLORS[e.type] || ''}`}>{e.type}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ActorIcon className="h-3 w-3" /> <span>{e.actor?.name || 'system'}</span>
                          <span>•</span><span>{timeAgo(e.timestamp)}</span>
                          <span className="ml-auto flex items-center gap-2">
                            {e.processed ? <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 h-5">processed</Badge> : <Badge variant="outline" className="text-[10px] h-5">pending</Badge>}
                            <Badge variant="outline" className="text-[10px] h-5">{e.listenersInvoked?.length || 0} listeners</Badge>
                            {failures > 0 && <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30 h-5">{failures} failed</Badge>}
                          </span>
                        </div>
                        <p className="text-xs font-mono mt-1 text-muted-foreground truncate">id: {e.id}</p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle>Subscriptions</CardTitle><CardDescription>Modules listening per event type</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {types.map((t) => (
                <div key={t} className="p-3 rounded-lg border bg-card/40">
                  <Badge variant="outline" className={`text-[10px] font-mono ${EVENT_COLORS[t] || ''}`}>{t}</Badge>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(subscriptions[t] || []).length === 0 ? (
                      <span className="text-[11px] text-muted-foreground">No subscribers</span>
                    ) : (subscriptions[t] || []).map((m) => (
                      <Badge key={m} variant="outline" className="text-[10px] capitalize">{m}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className={`font-mono ${EVENT_COLORS[detail?.type] || ''}`}>{detail?.type}</Badge>
              <span className="text-sm font-mono text-muted-foreground">{detail?.id?.slice(0, 8)}…</span>
            </DialogTitle>
            <DialogDescription>{detail && new Date(detail.timestamp).toLocaleString()} • by {detail?.actor?.name}</DialogDescription>
          </DialogHeader>
          {detail && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Payload</p>
                  <pre className="text-[11px] bg-card/40 border rounded-lg p-3 overflow-x-auto font-mono">{JSON.stringify(detail.payload, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Listeners invoked ({detail.listenersInvoked?.length || 0})</p>
                  <div className="space-y-2">
                    {(detail.listenersInvoked || []).length === 0 && <p className="text-xs text-muted-foreground">No listeners registered for this event.</p>}
                    {(detail.listenersInvoked || []).map((l, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-card/40">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {l.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-rose-500" />}
                            <span className="text-sm font-semibold capitalize">{l.moduleId}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">{l.durationMs}ms</span>
                        </div>
                        {l.result?.note && <p className="text-xs text-muted-foreground mt-1">{l.result.note}</p>}
                        {l.error && <p className="text-xs text-rose-500 mt-1 font-mono">{l.error}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
