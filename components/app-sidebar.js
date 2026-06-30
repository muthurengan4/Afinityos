'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { navItems, groupLabels } from '@/lib/nav-config';
import { AppLogo } from './app-logo';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppSidebar({ collapsed = false }) {
  const pathname = usePathname();
  const groups = ['main', 'business', 'system'];

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 border-r border-border/60 bg-sidebar/80 backdrop-blur-xl transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      <div className="h-16 px-5 flex items-center border-b border-border/60">
        <AppLogo withText={!collapsed} size={32} />
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-6">
        {groups.map((g) => (
          <div key={g}>
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {groupLabels[g]}
              </p>
            )}
            <ul className="space-y-1">
              {navItems.filter((i) => i.group === g).map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname?.startsWith(item.href + '/');
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-violet-500 to-fuchsia-500"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-primary')} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-semibold bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-primary border border-primary/20">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-border/60">
          <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-indigo-500/10 border border-primary/20">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-violet-500/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold">Upgrade to Enterprise</p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">Unlock the full AI workforce and unlimited seats.</p>
              <button className="w-full h-8 text-xs font-medium rounded-md bg-foreground text-background hover:opacity-90 transition">
                View plans
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
