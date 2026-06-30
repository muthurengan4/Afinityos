'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Building2, MapPin, Briefcase, Tag, Calendar, Edit, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function CustomerProfileHeader({ customer, onEdit }) {
  if (!customer) return null;
  const initials = `${customer.firstName?.[0] || ''}${customer.lastName?.[0] || ''}`.toUpperCase();
  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
  const healthColor = customer.healthScore >= 80 ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    : customer.healthScore >= 60 ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
    : 'text-rose-500 bg-rose-500/10 border-rose-500/30';

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl glass p-6 mb-6">
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-start gap-6">
        <Avatar className="h-24 w-24 ring-4 ring-primary/20">
          {customer.avatarUrl && <AvatarImage src={customer.avatarUrl} alt={fullName} />}
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-2xl font-bold">{initials || 'C'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{fullName || 'Unnamed customer'}</h1>
              {customer.jobTitle && <p className="text-sm text-muted-foreground mt-0.5">{customer.jobTitle}{customer.company ? ` • ${customer.company}` : ''}</p>}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {customer.segment && <Badge variant="outline" className="bg-violet-500/10 text-violet-500 border-violet-500/30">{customer.segment}</Badge>}
                {customer.plan && <Badge variant="outline">{customer.plan}</Badge>}
                <Badge variant="outline" className={cn('font-semibold', healthColor)}>Health {customer.healthScore}</Badge>
                {(customer.tags || []).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]"><Tag className="h-3 w-3 mr-1" />{t}</Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}><Edit className="h-4 w-4 mr-2" /> Edit</Button>
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><ExternalLink className="h-4 w-4 mr-2" /> Open in CRM</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span className="truncate">{customer.email}</span></div>
            <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{customer.phone || '—'}</span></div>
            <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="truncate">{customer.company || '—'}</span></div>
            <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="truncate">{customer.address || '—'}</span></div>
            <div className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4 text-muted-foreground" /><span className="truncate">Owner: {customer.ownerName || '—'}</span></div>
            <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span>Created {new Date(customer.createdAt).toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
