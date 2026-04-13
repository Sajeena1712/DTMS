import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export default function MetricCard({ label, value, detail, accent = "violet", theme = "light" }) {
const accentMap =
    accent === "cyan"
      ? theme === "dark"
        ? "from-cyan-400/30 via-cyan-300/10 to-transparent"
        : "from-cyan-300/28 via-cyan-200/10 to-white/10"
      : accent === "rose"
        ? theme === "dark"
          ? "from-amber-400/24 via-purple-400/10 to-transparent"
          : "from-orange-300/24 via-rose-200/10 to-white/10"
        : accent === "green"
          ? "from-emerald-400/30 via-emerald-300/10 to-transparent"
          : theme === "dark"
            ? "from-indigo-400/30 via-purple-400/12 to-transparent"
            : "from-indigo-300/28 via-violet-200/10 to-white/10";

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "overflow-hidden rounded-[28px] border bg-gradient-to-br p-5 backdrop-blur-xl",
        accentMap,
        theme === "dark"
          ? "border-white/10 bg-white/5 shadow-[0_22px_50px_rgba(2,6,23,0.40)]"
          : "task-panel",
      )}
    >
      <p className={cn("text-xs uppercase tracking-[0.28em]", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
        {label}
      </p>
      <p className={cn("mt-4 font-display text-4xl font-semibold", theme === "dark" ? "text-white" : "text-slate-950")}>
        {value}
      </p>
      <p className={cn("mt-3 text-sm leading-6", theme === "dark" ? "text-slate-300" : "text-slate-600")}>
        {detail}
      </p>
    </motion.article>
  );
}
