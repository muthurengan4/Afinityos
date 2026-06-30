'use client';

import { Gift, Trophy, Sparkles, Plus, Zap, Star, Users } from 'lucide-react';
import { PageHeader, StatCard, FeatureCard } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const tiers = [
  { name: 'Bronze', members: '12,400', perks: '5 perks', color: 'from-amber-700 to-amber-500', progress: 100 },
  { name: 'Silver', members: '3,820', perks: '8 perks', color: 'from-slate-400 to-slate-300', progress: 100 },
  { name: 'Gold', members: '842', perks: '14 perks', color: 'from-yellow-500 to-amber-400', progress: 80 },
  { name: 'Platinum', members: '128', perks: '22 perks', color: 'from-violet-500 to-fuchsia-500', progress: 60 },
];

export default function RewardsPage() {
  return (
    <div>
      <PageHeader
        title="Rewards"
        description="Loyalty programs, tiers and perks — built to compound retention."
        icon={Gift}
        accent="violet"
        actions={
          <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="h-4 w-4 mr-2" /> New program</Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total members" value="17,190" delta="+8%" icon={Users} accent="violet" index={0} />
        <StatCard label="Points redeemed" value="1.2M" delta="+24%" icon={Zap} accent="emerald" index={1} />
        <StatCard label="Engagement uplift" value="+42%" delta="+8pts" icon={Sparkles} accent="blue" index={2} />
        <StatCard label="Top tier members" value="128" delta="+12" icon={Trophy} accent="amber" index={3} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tiers.map((t, i) => (
          <Card key={t.name} className="glass relative overflow-hidden">
            <div className={`absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gradient-to-br ${t.color} opacity-20 blur-2xl`} />
            <CardHeader className="pb-2">
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center mb-2`}><Star className="h-5 w-5 text-white" /></div>
              <CardTitle className="text-base">{t.name}</CardTitle>
              <CardDescription>{t.members} members • {t.perks}</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={t.progress} className="h-1.5" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
