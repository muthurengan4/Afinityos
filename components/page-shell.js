'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, icon: Icon, badge, actions, accent = 'violet' }) {
  const accents = {
    violet: 'from-violet-500 to-fuchsia-500',
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    rose: 'from-rose-500 to-pink-500',
    indigo: 'from-indigo-500 to-violet-500',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
    >
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg shadow-primary/20', accents[accent])}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {badge && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">{badge}</Badge>}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </motion.div>
  );
}

export function StatCard({ label, value, delta, icon: Icon, accent = 'violet', index = 0 }) {
  const accents = {
    violet: 'from-violet-500/20 to-fuchsia-500/10 text-violet-500',
    blue: 'from-blue-500/20 to-cyan-500/10 text-blue-500',
    emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-500',
    amber: 'from-amber-500/20 to-orange-500/10 text-amber-500',
    rose: 'from-rose-500/20 to-pink-500/10 text-rose-500',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="relative overflow-hidden glass">
        <div className={cn('absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl', accents[accent])} />
        <CardContent className="p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          </div>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {delta && (
            <p className={cn('text-xs mt-2 font-medium', delta.startsWith('+') ? 'text-emerald-500' : 'text-rose-500')}>
              {delta} <span className="text-muted-foreground font-normal">vs last period</span>
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function FeatureCard({ title, description, icon: Icon, badge, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <Card className="h-full glass hover:border-primary/40 transition-colors group cursor-pointer relative overflow-hidden">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            {Icon && (
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-primary/20 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
          </div>
          <CardTitle className="text-base flex items-center justify-between">
            {title}
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </CardTitle>
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

export function ComingSoonNote({ title = 'Module ready for configuration' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-8"
    >
      <Card className="glass border-dashed">
        <CardContent className="py-8 flex flex-col items-center text-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">This module is part of AfinityOS modular architecture. Business logic and integrations can be enabled per organization.</p>
          </div>
          <Button size="sm" variant="outline">Request access</Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
