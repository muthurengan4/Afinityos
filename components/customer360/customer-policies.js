'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, FileCheck } from 'lucide-react';
import { formatCurrency } from '@/lib/org-options';

export function CustomerPolicies({ policies = [], currency = 'USD', loading }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Policies</CardTitle>
        <CardDescription>Insurance coverage on this account</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading && <p className="px-6 pb-6 text-sm text-muted-foreground">Loading…</p>}
        {!loading && policies.length === 0 && <p className="px-6 pb-6 text-sm text-muted-foreground">No policies issued for this account yet.</p>}
        <div className="divide-y">
          {policies.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-6 py-4">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{p.policyNumber} • {p.policyType}</p>
                <p className="text-xs text-muted-foreground">Coverage {p.coverage} • {new Date(p.startDate).toLocaleDateString()} → {new Date(p.endDate).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{formatCurrency(p.premium, currency)}<span className="text-xs font-normal text-muted-foreground"> / yr</span></p>
                <Badge variant="outline" className={p.status === 'Active' ? 'text-emerald-500 border-emerald-500/30 mt-1' : 'text-muted-foreground mt-1'}>{p.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
