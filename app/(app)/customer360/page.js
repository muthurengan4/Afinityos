'use client';

import { Users, Filter, Plus, Search, Building2, Mail, Phone, Star } from 'lucide-react';
import { PageHeader, StatCard, ComingSoonNote } from '@/components/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

const customers = [
  { name: 'Acme Corp', email: 'finance@acme.com', plan: 'Enterprise', mrr: '$48,200', health: 'Healthy', segment: 'Strategic' },
  { name: 'Globex Inc', email: 'ops@globex.com', plan: 'Business', mrr: '$12,400', health: 'At Risk', segment: 'Growth' },
  { name: 'Initech', email: 'hello@initech.io', plan: 'Enterprise', mrr: '$36,800', health: 'Healthy', segment: 'Strategic' },
  { name: 'Umbrella LLC', email: 'support@umbrella.co', plan: 'Pro', mrr: '$8,600', health: 'Excellent', segment: 'Growth' },
  { name: 'Soylent Co', email: 'team@soylent.com', plan: 'Business', mrr: '$15,200', health: 'Healthy', segment: 'Mid-Market' },
];

export default function Customer360Page() {
  return (
    <div>
      <PageHeader
        title="Customer360"
        description="Unified customer intelligence — every signal, every interaction, one view."
        icon={Users}
        accent="blue"
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> New customer</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Accounts" value="12,847" delta="+312" accent="blue" icon={Building2} index={0} />
        <StatCard label="Strategic Accounts" value="124" delta="+8" accent="violet" icon={Star} index={1} />
        <StatCard label="At-Risk" value="42" delta="-12%" accent="rose" icon={Mail} index={2} />
        <StatCard label="Avg LTV" value="$184k" delta="+14%" accent="emerald" icon={Phone} index={3} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="glass">
          <CardContent className="p-0">
            <div className="p-4 border-b flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search customers, contacts, deals..." />
              </div>
              <Badge variant="outline">{customers.length} of 12,847</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left font-medium p-4">Account</th>
                    <th className="text-left font-medium p-4">Plan</th>
                    <th className="text-left font-medium p-4">MRR</th>
                    <th className="text-left font-medium p-4">Health</th>
                    <th className="text-left font-medium p-4">Segment</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.name} className="border-b hover:bg-accent/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <div className="leading-tight">
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><Badge variant="outline">{c.plan}</Badge></td>
                      <td className="p-4 font-medium">{c.mrr}</td>
                      <td className="p-4">
                        <Badge className={c.health === 'At Risk' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : c.health === 'Excellent' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'} variant="outline">{c.health}</Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{c.segment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <ComingSoonNote title="Customer360 data integrations available on request" />
    </div>
  );
}
