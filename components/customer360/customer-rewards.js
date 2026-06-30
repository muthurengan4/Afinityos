'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gift, Sparkles, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const tierAccents = {
  Bronze: 'from-amber-700 to-amber-500',
  Silver: 'from-slate-400 to-slate-300',
  Gold: 'from-yellow-500 to-amber-400',
  Platinum: 'from-violet-500 to-fuchsia-500',
};

export function CustomerRewards({ rewards, loading }) {
  if (loading) return (
    <Card className="glass"><CardHeader><CardTitle>Rewards</CardTitle></CardHeader><CardContent>Loading…</CardContent></Card>
  );
  if (!rewards) return (
    <Card className="glass"><CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-4 w-4" /> Rewards</CardTitle><CardDescription>No loyalty membership yet</CardDescription></CardHeader></Card>
  );
  const accent = tierAccents[rewards.tier] || 'from-violet-500 to-fuchsia-500';
  const nextTierAt = { Bronze: 5000, Silver: 15000, Gold: 30000, Platinum: 50000 }[rewards.tier] || 50000;
  const progress = Math.min(100, Math.round((rewards.lifetimePoints / nextTierAt) * 100));

  return (
    <Card className="glass relative overflow-hidden">
      <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Gift className="h-4 w-4" /> Rewards</CardTitle>
        <CardDescription>Loyalty tier and perks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-lg`}>
            <Trophy className="h-7 w-7 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{rewards.tier}</p>
            <p className="text-xs text-muted-foreground">{rewards.pointsBalance.toLocaleString()} pts available • {rewards.lifetimePoints.toLocaleString()} lifetime</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress to next tier</span>
            <span>{rewards.lifetimePoints.toLocaleString()} / {nextTierAt.toLocaleString()} pts</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Active perks</p>
          <div className="flex flex-wrap gap-2">
            {(rewards.perks || []).map((p) => (
              <Badge key={p} variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30">
                <Sparkles className="h-3 w-3 mr-1" /> {p}
              </Badge>
            ))}
          </div>
        </div>
        {rewards.history && rewards.history.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent activity</p>
            <div className="space-y-1.5">
              {rewards.history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Star className="h-3 w-3 text-amber-500" />{h.event}</span>
                  <span className="text-emerald-500 font-medium">+{h.points.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
