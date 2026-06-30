import { motion } from 'framer-motion';

export function AppLogo({ size = 32, withText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative"
        style={{ width: size, height: size }}
      >
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 shadow-lg shadow-violet-500/30" />
        <div className="absolute inset-[2px] rounded-[10px] bg-slate-950 flex items-center justify-center">
          <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>A</span>
        </div>
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-md -z-10" />
      </motion.div>
      {withText && (
        <div className="flex flex-col leading-none">
          <span className="font-bold tracking-tight text-foreground" style={{ fontSize: size * 0.5 }}>
            Afinity<span className="gradient-text">OS</span>
          </span>
          <span className="text-[10px] text-muted-foreground tracking-widest mt-0.5">ENTERPRISE</span>
        </div>
      )}
    </div>
  );
}
