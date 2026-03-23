import { motion } from "framer-motion";
import { displayPriority, displayTaskStatus, normalizePriority, normalizeTaskStatus, priorityTone, statusTone } from "../../lib/constants";
import { formatDate } from "../../lib/utils";

export default function TaskCard({ task, onOpen }) {
  const status = normalizeTaskStatus(task.status);
  const priority = normalizePriority(task.priority);

  return (
    <motion.button
      type="button"
      onClick={() => onOpen?.(task)}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      className="task-card task-card-hover w-full overflow-hidden p-0 text-left"
    >
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative h-60 overflow-hidden rounded-t-[24px] lg:h-full lg:rounded-l-[24px] lg:rounded-tr-none">
          <img src={task.image} alt={task.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.10),rgba(2,6,23,0.72))]" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>
              {displayTaskStatus(status)}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityTone[priority]}`}>
              {displayPriority(priority)} Priority
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.28em] text-white/70">Click to update progress</p>
            <h3 className="mt-3 font-display text-2xl font-semibold leading-tight">{task.title}</h3>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6 sm:p-7">
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Task details</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {task.description || "No description was provided for this task."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Deadline</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(task.deadline)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Assigned to</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{task.assignedUserName || task.assignedUser}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-blue-500">Current note</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {task.submission?.text || "Open the task to add a progress note, upload a file, and update the status."}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Task status</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{displayTaskStatus(status)}</p>
            </div>
            <span className="rounded-2xl bg-[linear-gradient(90deg,#2563EB_0%,#7C3AED_100%)] px-4 py-2 text-xs font-semibold text-white shadow-[0_18px_45px_rgba(87,83,255,0.22)]">
              Open form
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
