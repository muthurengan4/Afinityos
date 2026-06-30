'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

/**
 * AfinityOS brand mark. Source asset is /public/brand/afinityos-logo.png
 * — a hand-drawn gold tri-wing "A" on a light cream background.
 * We mount it on a soft amber-to-cream plate so the gold ink shows
 * cleanly on dark and light themes alike.
 */
export function AppLogo({ size = 32, withText = true, className = '' }) {
  const inner = Math.round(size * 0.86);
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative shrink-0"
        style={{ width: size, height: size }}
      >
        {/* gold-amber outer ring */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 shadow-lg shadow-amber-500/30" />
        {/* cream inner plate that matches the asset's own background so the gold ink reads cleanly */}
        <div
          className="absolute inset-[2px] rounded-[10px] flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #fdfaf2 0%, #f5ecd2 100%)' }}
        >
          <Image
            src="/brand/afinityos-logo.png"
            alt="AfinityOS"
            width={inner}
            height={inner}
            priority
            className="object-contain"
            style={{ width: inner, height: inner }}
          />
        </div>
        {/* soft amber halo */}
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-amber-400/25 to-yellow-600/20 blur-md -z-10" />
      </motion.div>
      {withText && (
        <div className="flex flex-col leading-none">
          <span className="font-bold tracking-tight text-foreground" style={{ fontSize: size * 0.5 }}>
            Afinity<span className="bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">OS</span>
          </span>
          <span className="text-[10px] text-muted-foreground tracking-widest mt-0.5">ENTERPRISE</span>
        </div>
      )}
    </div>
  );
}
