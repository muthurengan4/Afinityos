'use client';

import { BarChart3, TrendingUp, Users, Activity, DollarSign } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const data = [
  { name: 'W1', revenue: 41, churn: 4, users: 240 },
  { name: 'W2', revenue: 48, churn: 3, users: 280 },
  { name: 'W3', revenue: 62, churn: 5, users: 320 },
  { name: 'W4', revenue: 78, churn: 2, users: 410 },
  { name: 'W5', revenue: 84, churn: 3, users: 480 },
  { name: 'W6', revenue: 92, churn: 2, users: 520 },
];

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Cross-module insights powered by AfinityAI. Every metric, every team, real-time."
        icon={BarChart3}
        accent="blue"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Revenue (90d)" value="$2.4M" delta="+18%" icon={DollarSign} accent="emerald" index={0} />
        <StatCard label="Active users" value="42,180" delta="+12%" icon={Users} accent="violet" index={1} />
        <StatCard label="Conversion" value="6.8%" delta="+1.4pts" icon={TrendingUp} accent="blue" index={2} />
        <StatCard label="Engagement" value="38m" delta="+22%" icon={Activity} accent="amber" index={3} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="glass">
          <CardHeader><CardTitle>Revenue vs Churn</CardTitle><CardDescription>Last 6 weeks</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="churn" fill="hsl(var(--chart-5))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle>Active users</CardTitle><CardDescription>Weekly trend</CardDescription></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Line type="monotone" dataKey="users" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
