'use client';

import { useEffect, useState } from 'react';
import { Search, Globe, ShieldCheck, ShieldAlert, Code, CheckCircle2, XCircle, Loader2, RefreshCw, Server, Sparkles, ExternalLink, AlertTriangle } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function DiscoveryPage() {
  const { authFetch } = useAuth();
  const [prebaked, setPrebaked] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanUrl, setScanUrl] = useState('');
  const [scanLabel, setScanLabel] = useState('');
  const [scanning, setScanning] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/discovery/reports');
      if (res.ok) {
        const data = await res.json();
        setPrebaked(data.prebaked || []);
        setSaved(data.reports || []);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const runScan = async () => {
    if (!scanUrl) return toast.error('Enter a base URL');
    setScanning(true);
    try {
      const res = await authFetch('/api/discovery/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scanUrl, label: scanLabel || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Scanned ${data.report.baseUrl} — ${data.report.endpointsFound} endpoints found`);
      setScanUrl(''); setScanLabel('');
      load();
    } catch (e) { toast.error(e.message); }
    finally { setScanning(false); }
  };

  const ReportCard = ({ r, isPrebaked }) => {
    const endpoints = isPrebaked ? (r.discoveredEndpoints || []) : (r.endpoints || []);
    const live = endpoints.length > 0;
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass hover:border-primary/40 transition cursor-pointer h-full" onClick={() => setDetail({ r, isPrebaked })}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white"><Server className="h-5 w-5" /></div>
                <div>
                  <CardTitle className="text-base">{isPrebaked ? r.label : (r.label || new URL(r.baseUrl).host)}</CardTitle>
                  <CardDescription className="text-[11px] font-mono truncate max-w-[280px]">{r.baseUrl}</CardDescription>
                </div>
              </div>
              {live ? (
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10"><CheckCircle2 className="h-3 w-3 mr-1" /> API discovered</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10"><XCircle className="h-3 w-3 mr-1" /> No backend</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Framework:</span> <span className="font-medium">{r.framework || 'Unknown'}</span></div>
              <div><span className="text-muted-foreground">Auth:</span> <span className="font-medium">{r.authMechanism || 'Unknown'}</span></div>
              <div><span className="text-muted-foreground">OpenAPI:</span> {r.hasOpenApi ? <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">found</Badge> : <Badge variant="outline" className="text-muted-foreground">none</Badge>}</div>
              <div><span className="text-muted-foreground">Endpoints:</span> <span className="font-medium">{endpoints.length}</span></div>
              {isPrebaked && r.productName && <div className="col-span-2"><span className="text-muted-foreground">Product:</span> <span className="font-medium">{r.productName} v{r.productVersion}</span></div>}
            </div>
            {isPrebaked && r.features?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">{r.features.map((f) => <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>)}</div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const dr = detail?.r;
  const endpoints = detail ? (detail.isPrebaked ? (dr.discoveredEndpoints || []) : (dr.endpoints || [])) : [];

  return (
    <div>
      <PageHeader
        title="Integration Discovery"
        description="Auto-generated Integration Discovery Reports. AfinityOS probed each project's public preview URL — no manual route entry required."
        icon={Search}
        accent="blue"
        actions={<Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Reports" value={prebaked.length + saved.length} icon={Server} accent="violet" index={0} />
        <StatCard label="With APIs" value={prebaked.filter((r) => r.discoveredEndpoints?.length).length + saved.filter((r) => r.endpoints?.length).length} icon={CheckCircle2} accent="emerald" index={1} />
        <StatCard label="Frameworks" value={new Set([...prebaked, ...saved].map((r) => r.framework)).size} icon={Code} accent="blue" index={2} />
        <StatCard label="Auth schemes" value={new Set([...prebaked, ...saved].map((r) => r.authMechanism)).size} icon={ShieldCheck} accent="amber" index={3} />
      </div>

      <Card className="glass mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> Scan a new host</CardTitle>
          <CardDescription>Runs runtime probing against the base URL — OpenAPI specs + common REST patterns + framework detection + auth detection.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[260px] space-y-1"><Label className="text-xs">Base URL</Label><Input value={scanUrl} onChange={(e) => setScanUrl(e.target.value)} placeholder="https://your-service.example.com" /></div>
            <div className="flex-1 min-w-[200px] space-y-1"><Label className="text-xs">Label (optional)</Label><Input value={scanLabel} onChange={(e) => setScanLabel(e.target.value)} placeholder="e.g. Insurance backend" /></div>
            <Button onClick={runScan} disabled={scanning} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />} Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading…</div>
      ) : (
        <>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Auto-discovered Emergent projects</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {prebaked.map((r) => <ReportCard key={r.id} r={r} isPrebaked />)}
          </div>
          {saved.length > 0 && (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Your scans</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {saved.map((r) => <ReportCard key={r.id} r={r} isPrebaked={false} />)}
              </div>
            </>
          )}
        </>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> Integration Discovery Report</DialogTitle>
            <DialogDescription className="font-mono text-xs">{dr?.baseUrl}</DialogDescription>
          </DialogHeader>
          {detail && (
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg border bg-card/40"><p className="text-[10px] uppercase text-muted-foreground">Framework</p><p className="font-semibold mt-1">{dr.framework}</p></div>
                  <div className="p-3 rounded-lg border bg-card/40"><p className="text-[10px] uppercase text-muted-foreground">Auth</p><p className="font-semibold mt-1">{dr.authMechanism}</p></div>
                  {detail.isPrebaked && <div className="p-3 rounded-lg border bg-card/40"><p className="text-[10px] uppercase text-muted-foreground">Product</p><p className="font-semibold mt-1">{dr.productName} v{dr.productVersion}</p></div>}
                  <div className="p-3 rounded-lg border bg-card/40"><p className="text-[10px] uppercase text-muted-foreground">OpenAPI exposed</p><p className="font-semibold mt-1">{dr.hasOpenApi ? 'Yes' : 'No'}</p></div>
                </div>
                {detail.isPrebaked && dr.docsNote && <p className="text-xs text-muted-foreground italic">{dr.docsNote}</p>}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Endpoints ({endpoints.length})</p>
                  {endpoints.length === 0 ? <p className="text-xs text-muted-foreground">None discovered.</p> : (
                    <div className="space-y-1">
                      {endpoints.map((e, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono p-2 rounded border bg-card/40">
                          <Badge variant="outline" className="text-[10px] h-5">{e.method || (e.status === 405 ? 'POST' : 'GET')}</Badge>
                          <span className="font-medium">{e.path}</span>
                          {e.authRequired || e.auth ? <Badge variant="outline" className="text-[10px] h-5 text-amber-500 border-amber-500/30">auth</Badge> : <Badge variant="outline" className="text-[10px] h-5 text-emerald-500 border-emerald-500/30">public</Badge>}
                          <span className="text-muted-foreground ml-auto font-sans text-[11px] truncate max-w-[280px]">{e.purpose || (e.sample && `→ ${e.sample.slice(0, 60)}`)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {detail.isPrebaked && dr.connectorMapping && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Connector mapping</p>
                    <div className="space-y-1.5">
                      {Object.entries(dr.connectorMapping).map(([id, cfg]) => (
                        <div key={id} className="flex items-center gap-2 text-xs p-2 rounded border bg-card/40">
                          <Badge variant="outline" className="text-[10px] font-mono">{id}</Badge>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-mono">{cfg.baseUrl || '—'}</span>
                          {cfg.status === 'no-backend-discovered' && <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30 ml-auto"><AlertTriangle className="h-3 w-3 mr-1" /> {cfg.status}</Badge>}
                          {cfg.configurable && <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 ml-auto">ready</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detail.isPrebaked && dr.notes?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                    <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">{dr.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" asChild><a href={dr.baseUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" /> Open host</a></Button>
                  <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" asChild><a href="/connectors">Go to Connectors →</a></Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
