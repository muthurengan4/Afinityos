'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Activity, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/org-options';
import { cn } from '@/lib/utils';

export function CustomerStats({ customer, currency = 'USD' }) {
  const items = [
    { label: 'Lifetime value', value: formatCurrency(customer.lifetimeValue, currency), icon: DollarSign, accent: 'from-violet-500/20 to-fuchsia-500/10 text-violet-500' },
    { label: 'MRR', value: formatCurrency(customer.mrr, currency), icon: TrendingUp, accent: 'from-emerald-500/20 to-teal-500/10 text-emerald-500' },
    { label: 'Health score', value: customer.healthScore, icon: Heart, accent: 'from-rose-500/20 to-pink-500/10 text-rose-500' },
    { label: 'Engagement', value: customer.healthScore >= 80 ? 'Excellent' : customer.healthScore >= 60 ? 'Healthy' : 'At risk', icon: Activity, accent: 'from-blue-500/20 to-cyan-500/10 text-blue-500' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((it, i) => (
        <motion.div key={it.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Card className="relative overflow-hidden glass">
            <div className={cn('absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br blur-2xl', it.accent)} />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{it.label}</p>
                <it.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold tracking-tight">{it.value}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
