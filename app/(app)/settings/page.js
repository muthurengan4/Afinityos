'use client';

import { Settings, Building2, Users, Shield, KeyRound, Bell, Plug, Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { roleLabels } from '@/lib/nav-config';

const sampleUsers = [
  { name: 'Mira Chen', email: 'mira@acme.com', role: 'sales' },
  { name: 'Daniel Park', email: 'daniel@acme.com', role: 'marketing' },
  { name: 'Sara Liu', email: 'sara@acme.com', role: 'support' },
  { name: 'James Wu', email: 'james@acme.com', role: 'executive' },
];

export default function SettingsPage() {
  const { user, organization } = useAuth();

  return (
    <div>
      <PageHeader title="Settings" description="Workspace, members, roles, SSO and security." icon={Settings} accent="violet" />

      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="glass mb-6">
          <TabsTrigger value="organization"><Building2 className="h-4 w-4 mr-2" /> Organization</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-2" /> Members</TabsTrigger>
          <TabsTrigger value="roles"><Shield className="h-4 w-4 mr-2" /> Roles</TabsTrigger>
          <TabsTrigger value="sso"><KeyRound className="h-4 w-4 mr-2" /> SSO</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-2" /> Notifications</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="h-4 w-4 mr-2" /> Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="organization">
          <Card className="glass">
            <CardHeader><CardTitle>Organization details</CardTitle><CardDescription>Public information about your workspace</CardDescription></CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2"><Label>Organization name</Label><Input defaultValue={organization?.name} /></div>
              <div className="space-y-2"><Label>Workspace URL</Label><Input defaultValue={`afinityos.com/${(organization?.name || 'org').toLowerCase().replace(/\s+/g, '-')}`} /></div>
              <div className="space-y-2"><Label>Plan</Label><Input defaultValue={organization?.plan || 'starter'} disabled /></div>
              <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">Save changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Members</CardTitle><CardDescription>Invite teammates and assign roles</CardDescription></div>
              <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> Invite</Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                <div className="flex items-center gap-4 p-4 bg-accent/30">
                  <Avatar><AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs">{user?.name?.split(' ').map((p) => p[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                  <div className="flex-1"><p className="text-sm font-medium">{user?.name} (You)</p><p className="text-xs text-muted-foreground">{user?.email}</p></div>
                  <Badge variant="outline">{roleLabels[user?.role] || user?.role}</Badge>
                </div>
                {sampleUsers.map((u) => (
                  <div key={u.email} className="flex items-center gap-4 p-4">
                    <Avatar><AvatarFallback className="text-xs bg-secondary">{u.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
                    <div className="flex-1"><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                    <Badge variant="outline">{roleLabels[u.role]}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}
