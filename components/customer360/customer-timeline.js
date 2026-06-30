'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Bot, User, Cog, Mail, MailOpen, Phone, FileText, Ticket, Sparkles, CreditCard, ShieldCheck, Gift, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeMap = {
  signup: { icon: Star, accent: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', label: 'Signup' },
  login: { icon: User, accent: 'text-blue-500 bg-blue-500/10 border-blue-500/30', label: 'Login' },
  email_sent: { icon: Mail, accent: 'text-violet-500 bg-violet-500/10 border-violet-500/30', label: 'Email sent' },
  email_opened: { icon: MailOpen, accent: 'text-violet-500 bg-violet-500/10 border-violet-500/30', label: 'Email opened' },
  call: { icon: Phone, accent: 'text-blue-500 bg-blue-500/10 border-blue-500/30', label: 'Voice call' },
  ai_call: { icon: Bot, accent: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/30', label: 'AI call' },
  deal_created: { icon: FileText, accent: 'text-amber-500 bg-amber-500/10 border-amber-500/30', label: 'Deal created' },
  deal_won: { icon: Sparkles, accent: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', label: 'Deal won' },
  ticket_opened: { icon: Ticket, accent: 'text-rose-500 bg-rose-500/10 border-rose-500/30', label: 'Ticket opened' },
  ticket_resolved: { icon: Ticket, accent: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', label: 'Ticket resolved' },
  payment: { icon: CreditCard, accent: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', label: 'Payment' },
  policy_issued: { icon: ShieldCheck, accent: 'text-blue-500 bg-blue-500/10 border-blue-500/30', label: 'Policy issued' },
  reward_earned: { icon: Gift, accent: 'text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/30', label: 'Reward earned' },
  note: { icon: FileText, accent: 'text-muted-foreground bg-muted border-border', label: 'Note' },
};

const actorIcon = { user: User, ai: Bot, system: Cog };

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export function CustomerTimeline({ events = [], loading }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
        <CardDescription>Every signal across modules</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        <div className="relative space-y-5">
          {events.map((e, i) => {
            const meta = typeMap[e.type] || typeMap.note;
            const Icon = meta.icon;
            const ActorIcon = actorIcon[e.actor?.type] || User;
            return (
              <motion.div key={e.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center border', meta.accent)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {i !== events.length - 1 && <div className="flex-1 w-px bg-border/70 mt-1" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={cn('text-[10px]', meta.accent)}>{meta.label}</Badge>
                    <p className="text-sm font-semibold">{e.title}</p>
                  </div>
                  {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                    <ActorIcon className="h-3 w-3" />
                    <span>{e.actor?.name || 'System'}</span>
                    <span>•</span>
                    <span>{timeAgo(e.occurredAt)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
