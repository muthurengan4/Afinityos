import {
  LayoutDashboard,
  Users,
  Bot,
  TrendingUp,
  Megaphone,
  LifeBuoy,
  Shield,
  Gift,
  Store,
  BarChart3,
  CreditCard,
  Settings,
} from 'lucide-react';

export const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, group: 'main' },
  { label: 'Customer360', href: '/customer360', icon: Users, group: 'main' },
  { label: 'AI Workforce', href: '/ai-workforce', icon: Bot, group: 'main', badge: 'NEW' },
  { label: 'Sales', href: '/sales', icon: TrendingUp, group: 'business' },
  { label: 'Marketing', href: '/marketing', icon: Megaphone, group: 'business' },
  { label: 'Support', href: '/support', icon: LifeBuoy, group: 'business' },
  { label: 'Insurance', href: '/insurance', icon: Shield, group: 'business' },
  { label: 'Rewards', href: '/rewards', icon: Gift, group: 'business' },
  { label: 'Marketplace', href: '/marketplace', icon: Store, group: 'business' },
  { label: 'Analytics', href: '/analytics', icon: BarChart3, group: 'system' },
  { label: 'Billing', href: '/billing', icon: CreditCard, group: 'system' },
  { label: 'Settings', href: '/settings', icon: Settings, group: 'system' },
];

export const groupLabels = {
  main: 'Workspace',
  business: 'Business Suite',
  system: 'System',
};

export const roleLabels = {
  super_admin: 'Super Admin',
  org_admin: 'Organization Admin',
  sales: 'Sales',
  marketing: 'Marketing',
  support: 'Support',
  executive: 'Executive',
  standard_user: 'Standard User',
};
