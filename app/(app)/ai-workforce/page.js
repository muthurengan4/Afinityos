'use client';

import { Bot, Sparkles, Play, Plus, Cpu, MessageSquare, Mail, Headphones } from 'lucide-react';
import { PageHeader, FeatureCard, StatCard } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

const agents = [
  { name: 'Aria', role: 'Support Specialist', icon: Headphones, status: 'Active', tasks: '1,248 tickets resolved', model: 'AfinityAI v4.2' },
  { name: 'Vega', role: 'Sales Outreach', icon: Mail, status: 'Active', tasks: '320 meetings booked', model: 'AfinityAI v4.2' },
  { name: 'Lumen', role: 'Marketing Strategist', icon: Sparkles, status: 'Active', tasks: '12 campaigns running', model: 'AfinityAI v4.2' },
  { name: 'Orion', role: 'Insurance Analyst', icon: Cpu, status: 'Active', tasks: '84 claims processed', model: 'AfinityAI v4.2' },
  { name: 'Echo', role: 'Knowledge Assistant', icon: MessageSquare, status: 'Idle', tasks: '—', model: 'AfinityAI v4.2' },
];

export default function AIWorkforcePage() {
  return (
    <div>
      <PageHeader
        title="AI Workforce"
        description="Hire, deploy and orchestrate enterprise-grade AI agents across your entire org."
        icon={Bot}
        badge="NEW"
        accent="indigo"
        actions={
          <>
            <Button variant="outline" size="sm"><Play className="h-4 w-4 mr-2" /> Run playbook</Button>
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> Hire agent</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active agents" value="24" delta="+4" accent="violet" icon={Bot} index={0} />
        <StatCard label="Tasks automated (30d)" value="38,210" delta="+28.6%" accent="emerald" icon={Sparkles} index={1} />
        <StatCard label="Avg resolution time" value="42s" delta="-18%" accent="blue" icon={Cpu} index={2} />
        <StatCard label="Cost saved" value="$184k" delta="+22%" accent="amber" icon={MessageSquare} index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {agents.map((a, i) => (
          <motion.div key={a.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass hover:border-primary/40 transition">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white">
                      <a.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {a.name}
                        <span className={`h-2 w-2 rounded-full ${a.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500' : 'bg-muted-foreground/40'}`} />
                      </CardTitle>
                      <CardDescription>{a.role}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{a.model}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">{a.tasks}</p>
                  <Button size="sm" variant="ghost">Configure</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
