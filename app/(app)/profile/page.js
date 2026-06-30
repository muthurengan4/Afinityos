'use client';

import { useState } from 'react';
import { User as UserIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth-context';
import { roleLabels } from '@/lib/nav-config';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const { user, organization, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', title: user?.title || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);

  const initials = (user?.name || 'U').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profile" description="Your personal information and account preferences" icon={UserIcon} accent="violet" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 ring-4 ring-primary/20"><AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-2xl font-bold">{initials}</AvatarFallback></Avatar>
            <h3 className="text-lg font-semibold mt-4">{user?.name}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge variant="outline" className="mt-2">{roleLabels[user?.role] || user?.role}</Badge>
            <p className="text-xs text-muted-foreground mt-4">Member of <span className="font-medium text-foreground">{organization?.name}</span></p>
            <Button variant="outline" size="sm" className="mt-4">Change avatar</Button>
          </CardContent>
        </Card>

        <Card className="glass lg:col-span-2">
          <CardHeader><CardTitle>Personal information</CardTitle><CardDescription>Update your details visible across AfinityOS</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Head of Sales" /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input value={user?.email} disabled /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 010 0101" /></div>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
