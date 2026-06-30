'use client';

import { CreditCard, Download, Plus, CheckCircle2, Calendar } from 'lucide-react';
import { PageHeader, StatCard } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const plans = [
  { name: 'Starter', price: '$0', features: ['Up to 5 users', '3 modules', 'Community support'], current: false },
  { name: 'Business', price: '$49', features: ['Unlimited users', 'All modules', 'AI Workforce (3 agents)', 'Email support'], current: true },
  { name: 'Enterprise', price: 'Custom', features: ['Unlimited AI agents', 'SSO + SCIM', 'Dedicated CSM', '24/7 support', 'SOC2 + DPA'], current: false },
];

const invoices = [
  { id: 'INV-00284', date: 'Jun 1, 2025', amount: '$1,470', status: 'Paid' },
  { id: 'INV-00271', date: 'May 1, 2025', amount: '$1,470', status: 'Paid' },
  { id: 'INV-00258', date: 'Apr 1, 2025', amount: '$1,420', status: 'Paid' },
];

export default function BillingPage() {
  return (
    <div>
      <PageHeader
        title="Billing"
        description="Manage your plan, seats and payment methods."
        icon={CreditCard}
        accent="emerald"
        actions={<Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" /> Add payment method</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Current plan" value="Business" delta="+0%" icon={CheckCircle2} accent="emerald" index={0} />
        <StatCard label="Seats used" value="42 / 100" icon={CreditCard} accent="violet" index={1} />
        <StatCard label="Next invoice" value="$1,470" icon={Calendar} accent="blue" index={2} />
        <StatCard label="YTD spend" value="$8,820" delta="+12%" icon={Download} accent="amber" index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {plans.map((p) => (
          <Card key={p.name} className={`glass relative ${p.current ? 'border-primary/50 ring-1 ring-primary/30' : ''}`}>
            {p.current && <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">Current</Badge>}
            <CardHeader>
              <CardTitle>{p.name}</CardTitle>
              <CardDescription className="text-2xl font-bold text-foreground">{p.price}<span className="text-xs font-normal text-muted-foreground"> / seat / mo</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {f}
                </div>
              ))}
              <Button className={`w-full mt-4 ${p.current ? '' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'}`} variant={p.current ? 'outline' : 'default'} disabled={p.current}>
                {p.current ? 'Current plan' : 'Upgrade'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass">
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-sm">{inv.id}</p>
                  <p className="text-xs text-muted-foreground">{inv.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold">{inv.amount}</p>
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">{inv.status}</Badge>
                  <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
