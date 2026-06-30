'use client';

import { useEffect, useState } from 'react';
import { Settings, Building2, Users, Shield, KeyRound, Bell, Plug, Plus, Loader2, Copy, X, MoreVertical, Mail } from 'lucide-react';
import { PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth-context';
import { roleLabels } from '@/lib/nav-config';
import { TIMEZONES, CURRENCIES, LANGUAGES, SUBSCRIPTION_PLANS } from '@/lib/org-options';
import { toast } from 'sonner';

const ROLE_OPTIONS = ['org_admin', 'sales', 'marketing', 'support', 'executive', 'standard_user'];

export default function SettingsPage() {
  const { user, organization, authFetch } = useAuth();
  const [orgForm, setOrgForm] = useState(null);
  const [savingOrg, setSavingOrg] = useState(false);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'sales' });
  const [creating, setCreating] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState(null);

  const isAdmin = ['super_admin', 'org_admin'].includes(user?.role);

  const loadAll = async () => {
    try {
      const [oRes, mRes, iRes] = await Promise.all([
        authFetch('/api/organization'),
        authFetch('/api/organization/members'),
        authFetch('/api/organization/invites'),
      ]);
      if (oRes.ok) setOrgForm((await oRes.json()).organization);
      if (mRes.ok) setMembers((await mRes.json()).members || []);
      if (iRes.ok) setInvites(((await iRes.json()).invites || []).filter((i) => i.status === 'pending'));
    } catch (e) {
      toast.error('Failed to load settings');
    }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const saveOrg = async () => {
    setSavingOrg(true);
    try {
      const res = await authFetch('/api/organization', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgForm.name, logoUrl: orgForm.logoUrl, timezone: orgForm.timezone,
          currency: orgForm.currency, language: orgForm.language, plan: orgForm.plan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrgForm(data.organization);
      toast.success('Organization saved');
    } catch (e) { toast.error(e.message); }
    finally { setSavingOrg(false); }
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await authFetch('/api/organization/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const link = `${window.location.origin}/invite/${data.invite.token}`;
      setLastInviteLink(link);
      toast.success('Invite created');
      setInviteForm({ email: '', role: 'sales' });
      loadAll();
    } catch (e) { toast.error(e.message); }
    finally { setCreating(false); }
  };

  const cancelInvite = async (id) => {
    const res = await authFetch(`/api/organization/invites/${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Invite cancelled'); loadAll(); }
  };

  const changeRole = async (memberId, role) => {
    const res = await authFetch(`/api/organization/members/${memberId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) { toast.success('Role updated'); loadAll(); }
    else toast.error('Failed to update role');
  };

  const removeMember = async (memberId) => {
    if (!confirm('Remove this member from the organization?')) return;
    const res = await authFetch(`/api/organization/members/${memberId}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Member removed'); loadAll(); }
    else toast.error('Failed to remove member');
  };

  const copyLink = (link) => { navigator.clipboard.writeText(link); toast.success('Link copied'); };

  if (!orgForm) {
    return <div className="py-20 flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading settings…</div>;
  }

  return (
    <div>
      <PageHeader title="Settings" description="Workspace, members, roles, SSO, integrations." icon={Settings} accent="violet" />

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="glass mb-6 flex-wrap h-auto">
          <TabsTrigger value="organization"><Building2 className="h-4 w-4 mr-2" /> Organization</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-2" /> Members</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-2" /> Roles</TabsTrigger>
          <TabsTrigger value="sso"><KeyRound className="h-4 w-4 mr-2" /> SSO</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="h-4 w-4 mr-2" /> Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card className="glass">
            <CardHeader><CardTitle>Organization details</CardTitle><CardDescription>Public information and workspace defaults</CardDescription></CardHeader>
            <CardContent className="space-y-6 max-w-3xl">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                  {orgForm.logoUrl && <AvatarImage src={orgForm.logoUrl} alt={orgForm.name} />}
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xl">{(orgForm.name || 'O')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Label>Company logo URL</Label>
                  <Input value={orgForm.logoUrl || ''} placeholder="https://...logo.png" onChange={(e) => setOrgForm({ ...orgForm, logoUrl: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground">Paste a public image URL. Hosted upload coming soon.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Organization name</Label><Input value={orgForm.name || ''} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Workspace ID</Label><Input value={orgForm.id} disabled /></div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={orgForm.timezone || 'America/Los_Angeles'} onValueChange={(v) => setOrgForm({ ...orgForm, timezone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default currency</Label>
                  <Select value={orgForm.currency || 'USD'} onValueChange={(v) => setOrgForm({ ...orgForm, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={orgForm.language || 'en-US'} onValueChange={(v) => setOrgForm({ ...orgForm, language: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subscription plan</Label>
                  <Select value={orgForm.plan || 'starter'} onValueChange={(v) => setOrgForm({ ...orgForm, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SUBSCRIPTION_PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label} — {p.price}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={loadAll}>Cancel</Button>
                <Button onClick={saveOrg} disabled={savingOrg || !isAdmin} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                  {savingOrg && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save changes
                </Button>
              </div>
              {!isAdmin && <p className="text-xs text-muted-foreground">You need admin privileges to edit organization settings.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <div className="space-y-6">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Members • {members.length}</CardTitle><CardDescription>Manage seats, roles and access</CardDescription></div>
                {isAdmin && <Button onClick={() => { setLastInviteLink(null); setInviteOpen(true); }} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> Invite</Button>}
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-4 p-4">
                      <Avatar><AvatarFallback className="text-xs bg-secondary">{(m.name || '').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><p className="text-sm font-medium">{m.name}</p>{m.id === user?.id && <Badge variant="outline" className="text-[10px]">You</Badge>}</div>
                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                      </div>
                      {isAdmin && m.id !== user?.id ? (
                        <Select value={m.role} onValueChange={(v) => changeRole(m.id, v)}>
                          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{roleLabels[m.role] || m.role}</Badge>
                      )}
                      {isAdmin && m.id !== user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => removeMember(m.id)} className="text-destructive focus:text-destructive"><X className="h-4 w-4 mr-2" /> Remove from organization</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader><CardTitle>Pending invitations • {invites.length}</CardTitle><CardDescription>Share these links with your team to onboard.</CardDescription></CardHeader>
              <CardContent className="p-0">
                {invites.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-6 py-4">No pending invitations.</p>
                ) : (
                  <div className="divide-y">
                    {invites.map((inv) => {
                      const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${inv.token}`;
                      return (
                        <div key={inv.id} className="flex items-center gap-4 p-4">
                          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center"><Mail className="h-4 w-4 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">{roleLabels[inv.role]} • expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => copyLink(link)}><Copy className="h-4 w-4 mr-2" /> Copy link</Button>
                          {isAdmin && <Button variant="ghost" size="sm" onClick={() => cancelInvite(inv.id)} className="text-rose-500 hover:text-rose-500">Cancel</Button>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <Card className="glass">
            <CardHeader><CardTitle>Roles & permissions</CardTitle><CardDescription>Granular RBAC for every module</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(roleLabels).map(([k, label]) => (
                <div key={k} className="p-4 rounded-lg border bg-card/40">
                  <div className="flex items-center justify-between mb-2"><p className="font-semibold text-sm">{label}</p><Badge variant="outline">{k}</Badge></div>
                  <p className="text-xs text-muted-foreground">Predefined permissions across modules. Customize per organization.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sso">
          <Card className="glass">
            <CardHeader><CardTitle>Single Sign-On</CardTitle><CardDescription>SAML 2.0, OIDC, Google Workspace, Okta</CardDescription></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="flex items-center justify-between p-3 rounded-lg border"><div><p className="font-medium text-sm">SAML 2.0</p><p className="text-xs text-muted-foreground">Generic identity providers</p></div><Switch /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><div><p className="font-medium text-sm">Google Workspace</p><p className="text-xs text-muted-foreground">Sign in with your Google org</p></div><Switch defaultChecked /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><div><p className="font-medium text-sm">Okta</p><p className="text-xs text-muted-foreground">Okta SSO via SAML/OIDC</p></div><Switch /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><div><p className="font-medium text-sm">SCIM provisioning</p><p className="text-xs text-muted-foreground">Auto-provision users & groups</p></div><Switch /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="glass">
            <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              {['Daily digest email', 'Slack alerts for high-priority tickets', 'New deal in pipeline', 'AI agent escalations', 'Weekly executive summary'].map((n) => (
                <div key={n} className="flex items-center justify-between p-3 rounded-lg border"><p className="text-sm">{n}</p><Switch defaultChecked /></div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="glass">
            <CardHeader><CardTitle>Integrations</CardTitle><CardDescription>Connect your stack — visit the marketplace for the full list</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['Salesforce', 'HubSpot', 'Slack', 'Zendesk', 'Stripe', 'Snowflake'].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 flex items-center justify-center font-bold">{i[0]}</div>
                  <div className="flex-1"><p className="text-sm font-medium">{i}</p><p className="text-[11px] text-muted-foreground">Not connected</p></div>
                  <Button size="sm" variant="outline">Connect</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={(o) => { setInviteOpen(o); if (!o) setLastInviteLink(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>They’ll get a secure link to join {orgForm.name}.</DialogDescription>
          </DialogHeader>
          {!lastInviteLink ? (
            <form onSubmit={sendInvite} className="space-y-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required placeholder="teammate@company.com" /></div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={creating} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send invite
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Share this secure link with your teammate:</p>
              <div className="flex gap-2">
                <Input value={lastInviteLink} readOnly className="font-mono text-xs" />
                <Button onClick={() => copyLink(lastInviteLink)}><Copy className="h-4 w-4" /></Button>
              </div>
              <p className="text-[11px] text-muted-foreground">The link expires in 7 days. Email delivery is not yet enabled — share manually.</p>
              <DialogFooter><Button onClick={() => setInviteOpen(false)}>Done</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
