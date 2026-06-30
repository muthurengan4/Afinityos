'use client';

import { Shield, FileCheck, AlertTriangle, DollarSign, Plus, Filter, ClipboardCheck } from 'lucide-react';
import { PageHeader, StatCard, FeatureCard, ComingSoonNote } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const claims = [
  { id: 'CLM-8842', policy: 'Cyber-Liability', insured: 'Acme Corp', amount: '$48,200', status: 'Under review', age: '2d' },
  { id: 'CLM-8841', policy: 'E&O', insured: 'Globex Inc', amount: '$12,400', status: 'Approved', age: '4h' },
  { id: 'CLM-8840', policy: 'Property', insured: 'Initech', amount: '$84,000', status: 'Approved', age: '1d' },
  { id: 'CLM-8839', policy: 'Auto-Fleet', insured: 'Umbrella', amount: '$6,800', status: 'Denied', age: '3d' },
];

export default function InsurancePage() {
  return (
    <div>
      <PageHeader
        title="Insurance"
        description="Policies, claims and risk — fully orchestrated with AI underwriting."
        icon={Shield}
        accent="blue"
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> New policy</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active policies" value="1,284" delta="+42" icon={FileCheck} accent="blue" index={0} />
        <StatCard label="Open claims" value="86" delta="-8" icon={ClipboardCheck} accent="amber" index={1} />
        <StatCard label="Loss ratio" value="62%" delta="-3pts" icon={AlertTriangle} accent="rose" index={2} />
        <StatCard label="Premiums (YTD)" value="$12.4M" delta="+18%" icon={DollarSign} accent="emerald" index={3} />
      </div>

      <Card className="glass mb-6">
        <CardHeader><CardTitle>Recent claims</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {claims.map((c) => (
              <div key={c.id} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{c.id} • {c.policy}</p>
                  <p className="text-xs text-muted-foreground">{c.insured} • filed {c.age} ago</p>
                </div>
                <p className="font-semibold text-sm w-24 text-right">{c.amount}</p>
                <Badge variant="outline" className={c.status === 'Approved' ? 'text-emerald-500 border-emerald-500/30' : c.status === 'Denied' ? 'text-rose-500 border-rose-500/30' : ''}>{c.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ComingSoonNote title="Underwriting models can be activated per policy line" />
    </div>
  );
}
