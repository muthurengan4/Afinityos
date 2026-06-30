'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import { Bell, Command, Moon, Search, Sun, LogOut, User, Settings, Building2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLogo } from './app-logo';
import { navItems, groupLabels, roleLabels } from '@/lib/nav-config';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

export function AppTopbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { user, organization, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="h-full px-4 lg:px-6 flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <div className="h-16 px-5 flex items-center border-b"><AppLogo /></div>
            <nav className="p-3 space-y-4 overflow-y-auto h-[calc(100vh-4rem)]">
              {['main', 'business', 'system'].map((g) => (
                <div key={g}>
                  <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{groupLabels[g]}</p>
                  <ul className="space-y-1">
                    {navItems.filter((i) => i.group === g).map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link href={item.href} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium', active ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60')}>
                            <Icon className="h-[18px] w-[18px]" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Org switcher */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent/60 cursor-pointer transition">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
            {(organization?.name || 'A')[0].toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-xs font-semibold">{organization?.name || 'Organization'}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{organization?.plan || 'starter'} plan</p>
          </div>
        </div>

        {/* Command bar */}
        <div className="flex-1 max-w-xl mx-auto relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search anything in AfinityOS..." className="pl-9 pr-16 h-9 bg-muted/40 border-border/60" />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            <Command className="h-3 w-3" /> K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {mounted && theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </Button>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-accent/60 transition">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left leading-tight">
                  <p className="text-xs font-semibold">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground">{roleLabels[user?.role] || user?.role}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Avatar className="h-8 w-8"><AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs">{initials}</AvatarFallback></Avatar>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}><User className="h-4 w-4 mr-2" /> Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}><Settings className="h-4 w-4 mr-2" /> Settings</DropdownMenuItem>
              <DropdownMenuItem><Building2 className="h-4 w-4 mr-2" /> Organization</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive"><LogOut className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
