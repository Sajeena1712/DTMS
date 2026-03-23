import { motion } from "framer-motion";

export default function AuthCard({ children, footer }) {
  return (
    <motion.div
      className="glass-panel overflow-hidden rounded-[32px]"
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="p-6 sm:p-8">{children}</div>
      {footer ? <div className="border-t border-white/10 bg-white/5 px-6 py-5 sm:px-8">{footer}</div> : null}
    </motion.div>
  );
}
