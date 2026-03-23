import { motion } from "framer-motion";
import { statusTone } from "../../lib/constants";

export default function ApplicationCard({ application, onEdit, onDelete }) {
  return (
    <motion.article
      whileHover={{ y: -8 }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 shadow-xl backdrop-blur-sm hover:shadow-2xl"
    >
      <img
        src={application.image}
        alt={application.company}
        className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl font-bold text-white drop-shadow-lg group-hover:text-cyan-300 transition-colors">
            {application.company}
          </h3>
          <motion.button
            onClick={onDelete}
            whileHover={{ scale: 1.05 }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/90 backdrop-blur-sm text-white shadow-lg hover:bg-rose-600 transition-all"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        </div>
        <p className="mt-2 text-lg font-semibold text-slate-200">{application.role}</p>
        <div className="mt-4 flex items-center gap-6 text-sm text-slate-300">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {application.location}
          </span>
          <span className="font-bold text-emerald-300">{application.salary}</span>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone[application.status.toLowerCase()] || 'bg-slate-500/20 text-slate-300'} backdrop-blur-sm shadow-lg`}
          >
            {application.status}
          </motion.span>
          <div className="flex gap-2">
            <motion.button
              onClick={onEdit}
              whileHover={{ scale: 1.05 }}
              className="px-4 py-2 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 backdrop-blur-sm shadow-lg transition-all text-sm"
            >
              Edit
            </motion.button>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          {new Date(application.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
        </p>
      </div>
    </motion.article>
  );
}

