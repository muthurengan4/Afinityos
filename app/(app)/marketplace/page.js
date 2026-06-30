'use client';

import { Store, Search, Filter, Plus, Star, Zap, Plug } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const apps = [
  { name: 'Salesforce', category: 'CRM', rating: 4.8, installs: '12k' },
  { name: 'HubSpot', category: 'Marketing', rating: 4.7, installs: '9.4k' },
  { name: 'Slack', category: 'Communication', rating: 4.9, installs: '24k' },
  { name: 'Zendesk', category: 'Support', rating: 4.6, installs: '7.8k' },
  { name: 'Stripe', category: 'Payments', rating: 4.9, installs: '14k' },
  { name: 'Snowflake', category: 'Data', rating: 4.8, installs: '6.2k' },
  { name: 'Gong', category: 'Sales Intelligence', rating: 4.6, installs: '4.1k' },
  { name: 'Notion', category: 'Productivity', rating: 4.7, installs: '11k' },
];

export default function MarketplacePage() {
  return (
    <div>
      <PageHeader
        title="Marketplace"
        description="AfinityOS-certified apps, agents and integrations — plug into your stack instantly."
        icon={Store}
        accent="indigo"
        actions={
          <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> Publish app</Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Listed apps" value="284" delta="+12" icon={Store} accent="violet" index={0} />
        <StatCard label="Installs (30d)" value="4,820" delta="+18%" icon={Plug} accent="blue" index={1} />
        <StatCard label="Avg rating" value="4.8" delta="+0.2" icon={Star} accent="amber" index={2} />
        <StatCard label="Certified" value="96%" delta="+4pts" icon={Zap} accent="emerald" index={3} />
      </div>

      <Card className="glass mb-6">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search apps, integrations, agents..." />
          </div>
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Categories</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {apps.map((a, i) => (
          <motion.div key={a.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="glass hover:border-primary/40 transition cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">{a.name[0]}</div>
                  <Badge variant="outline" className="text-[10px]">{a.category}</Badge>
                </div>
                <CardTitle className="text-base mt-2">{a.name}</CardTitle>
                <CardDescription className="text-xs flex items-center gap-3">
                  <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-amber-500 text-amber-500" /> {a.rating}</span>
                  <span>{a.installs} installs</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full">Install</Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
