'use client';

import { TrendingUp, Plus, Filter, DollarSign, Target, Trophy, Users } from 'lucide-react';
import { PageHeader, StatCard, ComingSoonNote, FeatureCard } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const deals = [
  { name: 'Acme Corp – Platform Expansion', value: '$180,000', stage: 'Negotiation', owner: 'Mira Chen', probability: 80 },
  { name: 'Globex – AI Workforce Pilot', value: '$48,000', stage: 'Proposal', owner: 'Daniel Park', probability: 60 },
  { name: 'Initech – Enterprise Renewal', value: '$240,000', stage: 'Closing', owner: 'Sara Liu', probability: 92 },
  { name: 'Umbrella – Insurance Module', value: '$36,000', stage: 'Qualification', owner: 'James Wu', probability: 30 },
];

export default function SalesPage() {
  return (
    <div>
      <PageHeader
        title="Sales"
        description="Pipeline, forecasting, deal intelligence — powered by AfinityAI."
        icon={TrendingUp}
        accent="emerald"
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> New deal</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pipeline value" value="$8.4M" delta="+18%" icon={DollarSign} accent="emerald" index={0} />
        <StatCard label="Open opportunities" value="264" delta="+12" icon={Target} accent="violet" index={1} />
        <StatCard label="Win rate" value="38%" delta="+4%" icon={Trophy} accent="blue" index={2} />
        <StatCard label="Active reps" value="42" delta="+3" icon={Users} accent="amber" index={3} />
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Top open deals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {deals.map((d) => (
              <div key={d.name} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-sm">{d.name}</p>
                  <p className="text-xs text-muted-foreground">Owner: {d.owner}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{d.stage}</Badge>
                  <p className="text-sm font-semibold w-24 text-right">{d.value}</p>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20" variant="outline">{d.probability}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ComingSoonNote title="Connect your CRM to import historical pipeline" />
    </div>
  );
}
