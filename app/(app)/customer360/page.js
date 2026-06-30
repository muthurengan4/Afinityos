'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Filter, Plus, Search, Building2, Star, Sparkles, Mail, Loader2 } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/org-options';

export default function Customer360Page() {
  const { authFetch, organization } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', company: '', jobTitle: '', phone: '' });

  const load = async (search = '') => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/customers${search ? `?q=${encodeURIComponent(search)}` : ''}`);
      const data = await res.json();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  const seedDemo = async () => {
    setSeeding(true);
    try {
      const res = await authFetch('/api/customers/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Seeded ${data.seeded} demo customers`);
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSeeding(false); }
  };

  const createCustomer = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await authFetch('/api/customers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Customer created');
      setCreateOpen(false);
      setForm({ firstName: '', lastName: '', email: '', company: '', jobTitle: '', phone: '' });
      router.push(`/customer360/${data.customer.id}`);
    } catch (e) { toast.error(e.message); }
    finally { setCreating(false); }
  };

  const strategic = customers.filter((c) => c.segment === 'Strategic').length;
  const atRisk = customers.filter((c) => c.healthScore < 60).length;
  const totalLTV = customers.reduce((a, b) => a + (b.lifetimeValue || 0), 0);
  const currency = organization?.currency || 'USD';

  return (
    <div>
      <PageHeader
        title="Customer360"
        description="Unified customer intelligence — every signal, every interaction, one master profile."
        icon={Users}
        accent="blue"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={seedDemo} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />} Seed demo data
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> New customer
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total accounts" value={total.toLocaleString()} accent="blue" icon={Building2} index={0} />
        <StatCard label="Strategic" value={strategic.toLocaleString()} accent="violet" icon={Star} index={1} />
        <StatCard label="At-risk" value={atRisk.toLocaleString()} accent="rose" icon={Mail} index={2} />
        <StatCard label="Total LTV" value={formatCurrency(totalLTV, currency)} accent="emerald" icon={Sparkles} index={3} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass">
          <CardContent className="p-0">
            <div className="p-4 border-b flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search customers, contacts, companies..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <Badge variant="outline">{customers.length} shown • {total} total</Badge>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="py-12 flex items-center justify-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading customers…</div>
              ) : customers.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center"><Users className="h-6 w-6 text-primary" /></div>
                  <p className="font-semibold">No customers yet</p>
                  <p className="text-sm text-muted-foreground max-w-md">Create your first customer or seed demo data to explore the full Customer360 experience.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={seedDemo}><Sparkles className="h-4 w-4 mr-2" /> Seed demo data</Button>
                    <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> New customer</Button>
                  </div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="text-left font-medium p-4">Customer</th>
                      <th className="text-left font-medium p-4">Company</th>
                      <th className="text-left font-medium p-4">Plan</th>
                      <th className="text-left font-medium p-4">MRR</th>
                      <th className="text-left font-medium p-4">LTV</th>
                      <th className="text-left font-medium p-4">Health</th>
                      <th className="text-left font-medium p-4">Segment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-accent/40 transition cursor-pointer" onClick={() => router.push(`/customer360/${c.id}`)}>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9"><AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">{`${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}`.toUpperCase()}</AvatarFallback></Avatar>
                            <div className="leading-tight">
                              <Link href={`/customer360/${c.id}`} className="font-medium hover:text-primary">{c.firstName} {c.lastName}</Link>
                              <p className="text-xs text-muted-foreground">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{c.company || '—'}</td>
                        <td className="p-4"><Badge variant="outline">{c.plan}</Badge></td>
                        <td className="p-4 font-medium">{formatCurrency(c.mrr, currency)}</td>
                        <td className="p-4 font-medium">{formatCurrency(c.lifetimeValue, currency)}</td>
                        <td className="p-4">
                          <Badge variant="outline" className={c.healthScore >= 80 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' : c.healthScore >= 60 ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-rose-500/10 text-rose-500 border-rose-500/30'}>{c.healthScore}</Badge>
                        </td>
                        <td className="p-4 text-muted-foreground">{c.segment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
            <DialogDescription>Create a master profile for this customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createCustomer} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>First name</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Last name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div className="space-y-2"><Label>Job title</Label><Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={creating} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create customer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
