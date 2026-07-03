'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { Plug, CheckCircle2, XCircle, Loader2, Cable, Settings as SettingsIcon, Play, ExternalLink, Sparkles, Activity, Code, Wand2, Copy } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ConnectorsPage() {
  const { authFetch, user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [connectors, setConnectors] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configFor, setConfigFor] = useState(null);
  const [cfgForm, setCfgForm] = useState({ baseUrl: '', apiKey: '', serviceEmail: '', servicePassword: '' });
  const [testing, setTesting] = useState({});
  const [tryFor, setTryFor] = useState(null); // {connector, tool}
  const [tryParams, setTryParams] = useState('{}');
  const [tryResult, setTryResult] = useState(null);
  const [trying, setTrying] = useState(false);
  const isAdmin = ['org_admin', 'super_admin'].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, callsRes] = await Promise.all([
        authFetch('/api/connectors'),
        authFetch('/api/ai-tools/calls?limit=20'),
      ]);
      if (cRes.ok) setConnectors((await cRes.json()).connectors || []);
      if (callsRes.ok) setCalls((await callsRes.json()).calls || []);
    } catch (e) {
      toast.error('Failed to load connectors');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Support deep-link to open a specific connector's config modal via ?connector=<id>
  useEffect(() => {
    const target = searchParams.get('connector');
    if (!target || connectors.length === 0) return;
    const c = connectors.find((x) => x.id === target);
    if (c) openConfig(c);
    // Strip the query param so the modal doesn't re-open on refresh
    router.replace('/connectors');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors, searchParams]);

  const openConfig = (c) => {
    setConfigFor(c);
    // Pre-fill with existing safe fields; passwords are never returned by the API.
    setCfgForm({
      baseUrl: c.config?.baseUrl || '',
      apiKey: '',
      serviceEmail: c.config?.serviceEmail || '',
      servicePassword: '',
    });
  };
  const saveConfig = async () => {
    // Only send fields the user actually filled — empty strings would wipe existing values.
    const payload = {};
    for (const k of ['baseUrl', 'apiKey', 'serviceEmail', 'servicePassword']) {
      if (cfgForm[k] && cfgForm[k].trim() !== '') payload[k] = cfgForm[k].trim();
    }
    if (Object.keys(payload).length === 0) {
      toast.error('Fill at least one field before saving.');
      return;
    }
    const res = await authFetch(`/api/connectors/${configFor.id}/config`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { toast.success('Configuration saved'); setConfigFor(null); load(); }
    else toast.error('Failed to save');
  };

  const testConn = async (c) => {
    setTesting((t) => ({ ...t, [c.id]: true }));
    try {
      const res = await authFetch(`/api/connectors/${c.id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.result?.mode === 'mock') toast.message(`${c.name}: not configured`, { description: data.result.message });
      else if (data.result?.ok) toast.success(`${c.name}: live ✓`);
      else toast.error(`${c.name}: ${data.result?.error || 'unreachable'}`);
    } finally {
      setTesting((t) => ({ ...t, [c.id]: false }));
    }
  };

  const tryTool = async () => {
    setTrying(true);
    setTryResult(null);
    try {
      let params = {};
      try { params = JSON.parse(tryParams || '{}'); } catch { toast.error('Invalid JSON'); setTrying(false); return; }
      const res = await authFetch(`/api/connectors/${tryFor.connector.id}/tools/${tryFor.tool.name}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      setTryResult(data.result);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setTrying(false); }
  };

  const copy = (s) => { navigator.clipboard.writeText(s); toast.success('Copied'); };

  const totalTools = connectors.reduce((a, c) => a + (c.toolCount || 0), 0);
  const configured = connectors.filter((c) => c.configured).length;

  return (
    <div>
      <PageHeader
        title="Connectors"
        description="Bridge AfinityOS to your existing systems. AI Agents use these connectors as tools — they never touch databases directly."
        icon={Cable}
        accent="indigo"
        badge="NEW"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Connectors" value={connectors.length} icon={Plug} accent="violet" index={0} />
        <StatCard label="Configured" value={`${configured} / ${connectors.length}`} icon={CheckCircle2} accent="emerald" index={1} />
        <StatCard label="AI tools available" value={totalTools} icon={Sparkles} accent="blue" index={2} />
        <StatCard label="Recent calls" value={calls.length} icon={Activity} accent="amber" index={3} />
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading connectors…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {connectors.map((c, i) => {
            const Icon = LucideIcons[c.icon] || Plug;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="glass h-full hover:border-primary/40 transition relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 blur-2xl" />
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-primary/20"><Icon className="h-5 w-5" /></div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">{c.name}</CardTitle>
                          <CardDescription className="text-xs">{c.description}</CardDescription>
                        </div>
                      </div>
                      {c.configured ? (
                        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10"><CheckCircle2 className="h-3 w-3 mr-1" /> Live</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10"><XCircle className="h-3 w-3 mr-1" /> Mock</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {c.tools?.map((t) => (
                        <Badge key={t.name} variant="outline" className="text-[10px] font-mono cursor-pointer hover:bg-primary/10" onClick={() => { setTryFor({ connector: c, tool: t }); setTryParams('{}'); setTryResult(null); }}>{t.name}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button variant="outline" size="sm" onClick={() => testConn(c)} disabled={testing[c.id]}>
                        {testing[c.id] ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />} Test
                      </Button>
                      {isAdmin && <Button variant="outline" size="sm" onClick={() => openConfig(c)}><SettingsIcon className="h-3 w-3 mr-1" /> Configure</Button>}
                      <p className="text-[10px] text-muted-foreground ml-auto font-mono">env: {c.envKey}</p>
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
          <CardTitle className="flex items-center gap-2"><Activity className="h-4 w-4" /> Recent AI-tool calls</CardTitle>
          <CardDescription>Audit log of every connector tool invocation</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {calls.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No tool calls yet. Click any tool above to run it.</p>
          ) : (
            <div className="divide-y">
              {calls.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-6 py-3">
                  <Badge variant="outline" className="text-[10px] font-mono">{c.connectorId}.{c.toolName}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${c.mode === 'live' ? 'text-emerald-500 border-emerald-500/30' : 'text-amber-500 border-amber-500/30'}`}>{c.mode}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${c.ok ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>{c.ok ? 'ok' : 'fail'}</Badge>
                  <span className="text-xs text-muted-foreground">by {c.actor?.name || c.userId} • {c.durationMs}ms • {new Date(c.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!configFor} onOpenChange={(o) => !o && setConfigFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure {configFor?.name}</DialogTitle>
            <DialogDescription>Per-organization connection. Overrides environment variables.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Base URL</Label><Input placeholder="https://crm.your-domain.com" value={cfgForm.baseUrl} onChange={(e) => setCfgForm({ ...cfgForm, baseUrl: e.target.value })} /></div>
            <div className="space-y-2"><Label>Static API key (optional)</Label><Input type="password" placeholder="sk-... (leave empty if using service login)" value={cfgForm.apiKey} onChange={(e) => setCfgForm({ ...cfgForm, apiKey: e.target.value })} /></div>
            <div className="text-xs text-muted-foreground">— or use a service account with JWT login —</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Service email</Label><Input placeholder="service@…" value={cfgForm.serviceEmail || ''} onChange={(e) => setCfgForm({ ...cfgForm, serviceEmail: e.target.value })} /></div>
              <div className="space-y-2"><Label>Service password</Label><Input type="password" value={cfgForm.servicePassword || ''} onChange={(e) => setCfgForm({ ...cfgForm, servicePassword: e.target.value })} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Default env keys: <code className="font-mono">{configFor?.envKey}_URL</code>, <code className="font-mono">{configFor?.envKey}_API_KEY</code></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigFor(null)}>Cancel</Button>
            <Button onClick={saveConfig} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tryFor} onOpenChange={(o) => !o && setTryFor(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap"><Wand2 className="h-4 w-4 text-primary" />
              <span className="font-mono">{tryFor?.connector?.id}.{tryFor?.tool?.name}</span>
              <Button variant="ghost" size="icon" onClick={() => copy(`${tryFor?.connector?.id}.${tryFor?.tool?.name}`)}><Copy className="h-3 w-3" /></Button>
            </DialogTitle>
            <DialogDescription>{tryFor?.tool?.description}</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="params">
            <TabsList><TabsTrigger value="params">Params</TabsTrigger><TabsTrigger value="schema">Schema</TabsTrigger>{tryResult && <TabsTrigger value="result">Result</TabsTrigger>}</TabsList>
            <TabsContent value="params">
              <Label className="text-xs">Tool parameters (JSON)</Label>
              <Textarea value={tryParams} onChange={(e) => setTryParams(e.target.value)} className="font-mono text-xs h-48" placeholder='{ "firstName": "Jane", "lastName": "Doe", "email": "jane@acme.com" }' />
              <p className="text-[10px] text-muted-foreground mt-1">If the connector isn&apos;t configured, the response will be MOCKED and clearly labeled.</p>
            </TabsContent>
            <TabsContent value="schema">
              <ScrollArea className="h-64 rounded-lg border p-3">
                <pre className="text-[11px] font-mono">{JSON.stringify(tryFor?.tool?.parameters, null, 2)}</pre>
              </ScrollArea>
            </TabsContent>
            {tryResult && (
              <TabsContent value="result">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`text-[10px] ${tryResult.mode === 'live' ? 'text-emerald-500 border-emerald-500/30' : 'text-amber-500 border-amber-500/30'}`}>{tryResult.mode}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${tryResult.ok ? 'text-emerald-500 border-emerald-500/30' : 'text-rose-500 border-rose-500/30'}`}>{tryResult.ok ? 'success' : 'error'}</Badge>
                  <Badge variant="outline" className="text-[10px]">status {tryResult.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{tryResult.durationMs}ms</Badge>
                </div>
                {tryResult.note && <p className="text-xs text-muted-foreground mb-2">{tryResult.note}</p>}
                <ScrollArea className="h-72 rounded-lg border p-3">
                  <pre className="text-[11px] font-mono">{JSON.stringify(tryResult, null, 2)}</pre>
                </ScrollArea>
              </TabsContent>
            )}
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTryFor(null)}>Close</Button>
            <Button onClick={tryTool} disabled={trying} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
              {trying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />} Execute tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
