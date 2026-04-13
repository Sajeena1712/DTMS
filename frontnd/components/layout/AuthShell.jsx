import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const defaultVisuals = [
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
];

export default function AuthShell({ children, aside }) {
  const visuals = useMemo(() => defaultVisuals, []);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveImage((current) => (current + 1) % visuals.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [visuals.length]);

  return (
    <div className="min-h-screen bg-app px-5 py-5 text-white md:px-8 md:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-7xl gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative hidden overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-[0_30px_90px_rgba(2,6,23,0.55)] lg:block"
        >
          {aside ?? (
            <>
              <AnimatePresence mode="wait">
                <motion.img
                  key={visuals[activeImage]}
                  src={visuals[activeImage]}
                  alt="DTMS workspace visual"
                  className="h-full w-full object-cover"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.01 }}
                  transition={{ duration: 0.75 }}
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.56)_55%,rgba(2,6,23,0.88))]" />
              <div className="absolute inset-x-0 bottom-0 p-10">
                <p className="text-xs uppercase tracking-[0.34em] text-slate-200/80">
                  Secure Digital Talent Management System
                </p>
                <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight">
                  Build, assign, and track talent tasks with clarity.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200/85">
                  A premium, role-based workspace designed for real teams — clean dashboards, smooth flows, and secure access.
                </p>
              </div>
            </>
          )}
        </motion.section>

        <div className="flex items-center justify-center">{children}</div>
      </div>
    </div>
  );
}
