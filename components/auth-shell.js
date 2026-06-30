'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { AppLogo } from './app-logo';
import { ShieldCheck, Sparkles, Workflow } from 'lucide-react';

export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: form */}
      <div className="flex flex-col p-6 sm:p-10 relative radial-glow">
        <div className="flex items-center justify-between">
          <Link href="/"><AppLogo /></Link>
          <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground transition">Need help?</Link>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>}
            </div>
            {children}
          </motion.div>
        </div>

        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <p>© {new Date().getFullYear()} AfinityOS, Inc.</p>
          {footer}
        </div>
      </div>

      {/* Right: hero panel */}
      <div className="hidden lg:flex relative overflow-hidden border-l border-border bg-slate-950">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-40 -right-20 w-[500px] h-[500px] rounded-full bg-violet-600/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-[420px] h-[420px] rounded-full bg-fuchsia-600/20 blur-3xl" />

        <div className="relative z-10 p-12 flex flex-col justify-between text-white w-full">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 backdrop-blur text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              The AI-native enterprise OS
            </span>
            <h2 className="text-4xl font-bold tracking-tight mt-6 leading-tight">
              One operating system for your <span className="gradient-text">entire revenue org.</span>
            </h2>
            <p className="text-white/60 mt-4 max-w-md">
              AfinityOS unifies CRM, AI workforce, marketing, support, insurance, rewards and analytics — built for enterprise teams that move fast.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Workflow, label: 'Unified workflows', value: '12 modules' },
              { icon: Sparkles, label: 'AI workforce', value: 'Always on' },
              { icon: ShieldCheck, label: 'Enterprise SSO', value: 'SOC2-ready' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <Icon className="h-5 w-5 text-violet-300 mb-2" />
                <p className="text-sm font-semibold">{value}</p>
                <p className="text-[11px] text-white/60">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
