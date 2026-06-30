'use client';

import { useEffect, useState } from 'react';
import { Boxes, Plug, CheckCircle2, XCircle, Loader2, Zap, Code, Network, Activity, FileText } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ModulesPage() {
  const { authFetch, user } = useAuth();
  const [modules, setModules] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const isAdmin = ['org_admin', 'super_admin'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, iRes] = await Promise.all([
        authFetch('/api/gateway/modules'),
        authFetch('/api/gateway/integrations'),
      ]);
      if (mRes.ok) setModules((await mRes.json()).modules || []);
      if (iRes.ok) setIntegrations((await iRes.json()).integrations || []);
    } catch (e) {
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggle = async (m) => {
    const action = m.installed ? 'uninstall' : 'install';
    const res = await authFetch(`/api/modules/${m.id}/${action}`, { method: 'POST' });
    if (res.ok) { toast.success(`Module ${m.id} ${action}ed`); load(); }
    else toast.error('Failed');
  };

  const installed = modules.filter((m) => m.installed).length;

  return (
    <div>
      <PageHeader
        title="Modules"
        description="Installable modules powering the AfinityOS platform. Toggle per organization."
        icon={Boxes}
        accent="indigo"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Registered modules" value={modules.length} icon={Boxes} accent="violet" index={0} />
        <StatCard label="Installed for org" value={installed} icon={CheckCircle2} accent="emerald" index={1} />
        <StatCard label="Integrations" value={integrations.length} icon={Plug} accent="blue" index={2} />
        <StatCard label="Gateway version" value="v1.0" icon={Network} accent="amber" index={3} />
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading modules…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {modules.map((m, i) => {
            const Icon = LucideIcons[m.icon] || Boxes;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="glass h-full hover:border-primary/40 transition">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">{m.name}<Badge variant="outline" className="text-[10px] font-mono">v{m.version}</Badge></CardTitle>
                          <CardDescription>{m.description}</CardDescription>
                        </div>
                      </div>
                      <Switch checked={m.installed} disabled={!isAdmin} onCheckedChange={() => toggle(m)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]"><Code className="h-3 w-3 mr-1" /> {m.routes?.length || 0} routes</Badge>
                      <Badge variant="outline" className="text-[10px]"><Activity className="h-3 w-3 mr-1" /> emits {m.events?.emits?.length || 0}</Badge>
                      <Badge variant="outline" className="text-[10px]"><Zap className="h-3 w-3 mr-1" /> listens {m.events?.listens?.length || 0}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(m.events?.emits || []).map((e) => (
                        <Badge key={e} className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30" variant="outline">↑ {e}</Badge>
                      ))}
                      {(m.events?.listens || []).map((e) => (
                        <Badge key={e} className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30" variant="outline">↓ {e}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className={`flex items-center gap-1 text-xs ${m.installed ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {m.installed ? <><CheckCircle2 className="h-3.5 w-3.5" /> Installed</> : <><XCircle className="h-3.5 w-3.5" /> Not installed</>}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => setDetail(m)}>View details</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="h-4 w-4" /> Future integrations</CardTitle>
          <CardDescription>Hooks the gateway exposes for upcoming third-party connections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {integrations.map((i) => (
              <div key={i.id} className="p-3 rounded-lg border bg-card/40">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold capitalize">{i.id.replace(/_/g, ' ')}</p>
                  <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">{i.status}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">Supported vendors: {(i.vendors || []).join(', ')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{detail?.name} <Badge variant="outline" className="font-mono text-[10px]">v{detail?.version}</Badge></DialogTitle>
            <DialogDescription>{detail?.description}</DialogDescription>
          </DialogHeader>
          {detail && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Routes</p>
                  <div className="space-y-1">
                    {detail.routes?.map((r) => (
                      <div key={`${r.method}-${r.path}`} className="flex items-start gap-2 text-xs font-mono p-2 rounded border bg-card/40">
                        <Badge variant="outline" className="text-[10px] h-5">{r.method}</Badge>
                        <span className="font-medium">/api{r.path}</span>
                        <span className="text-muted-foreground ml-auto font-sans">{r.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Permissions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.permissions?.map((p) => <Badge key={p} variant="outline" className="text-[10px] font-mono">{p}</Badge>)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Emits</p>
                    <div className="space-y-1">
                      {detail.events?.emits?.map((e) => <Badge key={e} variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">↑ {e}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Listens to</p>
                    <div className="space-y-1">
                      {detail.events?.listens?.map((e) => <Badge key={e} variant="outline" className="text-[10px] bg-blue-500/10 text-blue-500 border-blue-500/30">↓ {e}</Badge>)}
                    </div>
                  </div>
                </div>
                {detail.apiHooks && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Future API hooks</p>
                    <div className="space-y-1">
                      {Object.entries(detail.apiHooks).map(([k, v]) => (
                        <div key={k} className="text-xs p-2 rounded border bg-card/40"><span className="font-mono font-semibold">{k}</span> <span className="text-muted-foreground">— {v}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
