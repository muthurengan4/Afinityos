'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { LayoutDashboard, TrendingUp, Users, DollarSign, Activity, ArrowUpRight, Sparkles, Zap, Calendar } from 'lucide-react';
import { PageHeader, StatCard, FeatureCard } from '@/components/page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { CommandCenter } from '@/components/command-center';

const chartData = [
  { name: 'Mon', value: 32 }, { name: 'Tue', value: 48 }, { name: 'Wed', value: 41 },
  { name: 'Thu', value: 65 }, { name: 'Fri', value: 78 }, { name: 'Sat', value: 70 }, { name: 'Sun', value: 92 },
];

const activity = [
  { who: 'Aria (AI Agent)', what: 'closed 3 support tickets', when: '2m ago', accent: 'violet' },
  { who: 'Mira Chen', what: 'updated the Q3 Enterprise pipeline', when: '14m ago', accent: 'blue' },
  { who: 'Marketing bot', what: 'launched LinkedIn campaign “Expansion-EU”', when: '1h ago', accent: 'emerald' },
  { who: 'Daniel Park', what: 'approved an insurance claim ($12,400)', when: '2h ago', accent: 'amber' },
];

export default function DashboardPage() {
  const { user, organization } = useAuth();

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}`}
        description={`Here’s what’s happening at ${organization?.name || 'your organization'} today.`}
        icon={LayoutDashboard}
        badge="Live"
        actions={
          <>
            <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" /> Last 7 days</Button>
            <Button size="sm" asChild className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Link href="/ask"><Sparkles className="h-4 w-4 mr-2" /> Ask AfinityAI</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Annual Recurring Revenue" value="$4.82M" delta="+12.4%" icon={DollarSign} accent="violet" index={0} />
        <StatCard label="Active Customers" value="12,847" delta="+3.1%" icon={Users} accent="blue" index={1} />
        <StatCard label="AI Tasks Automated" value="38,210" delta="+28.6%" icon={Zap} accent="emerald" index={2} />
        <StatCard label="NPS Score" value="72" delta="+5.0%" icon={Activity} accent="amber" index={3} />
      </div>

      <CommandCenter />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-2">
          <Card className="glass h-full">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Revenue trend</CardTitle>
                <CardDescription>Net revenue across modules</CardDescription>
              </div>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                <TrendingUp className="h-3 w-3 mr-1" /> +18.4%
              </Badge>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#areaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle>Pipeline health</CardTitle>
              <CardDescription>By sales stage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { stage: 'Prospecting', value: 65, count: '128 deals' },
                { stage: 'Qualification', value: 48, count: '84 deals' },
                { stage: 'Proposal', value: 72, count: '36 deals' },
                { stage: 'Negotiation', value: 84, count: '12 deals' },
                { stage: 'Closed Won', value: 91, count: '$1.2M MRR' },
              ].map((s) => (
                <div key={s.stage}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium">{s.stage}</p>
                    <p className="text-[10px] text-muted-foreground">{s.count}</p>
                  </div>
                  <Progress value={s.value} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="glass h-full">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Across all modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                      {a.who.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-tight"><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.what}</span></p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.when}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="xl:col-span-2">
          <Card className="glass h-full">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>AI Workforce performance</CardTitle>
                <CardDescription>Your always-on team</CardDescription>
              </div>
              <Button size="sm" variant="outline">Manage agents <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Aria', role: 'Support Specialist', metric: '1,248 tickets', accent: 'violet' },
                { name: 'Vega', role: 'Sales Outreach', metric: '320 meetings booked', accent: 'blue' },
                { name: 'Lumen', role: 'Marketing Strategist', metric: '12 campaigns running', accent: 'emerald' },
                { name: 'Orion', role: 'Insurance Analyst', metric: '84 claims processed', accent: 'amber' },
              ].map((a, i) => (
                <div key={a.name} className="flex items-center gap-3 p-3 rounded-lg border bg-card/40 hover:border-primary/40 transition">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">{a.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{a.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{a.role} • {a.metric}</p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
