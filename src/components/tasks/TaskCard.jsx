import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useMemo, useState } from "react";
import { showApiError } from "../../api/client";
import { statusTone, taskStatuses } from "../../lib/constants";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";

export default function TaskCard({ task }) {
  const { user } = useAuth();
  const { updateTask } = useTasks();
  const [nextStatus, setNextStatus] = useState(task.status);
  const [submissionText, setSubmissionText] = useState(task.submission?.text ?? "");
  const [submissionFileName, setSubmissionFileName] = useState(task.submission?.fileName ?? "");
  const [submissionFileUrl, setSubmissionFileUrl] = useState(task.submission?.fileUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const meta = useMemo(
    () => [
      { label: "Assigned", value: task.assignedUserName || task.assignedUser },
      { label: "Due", value: task.dueDate },
      { label: "Updated", value: task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : "--" },
    ],
    [task.assignedUser, task.assignedUserName, task.dueDate, task.updatedAt],
  );

  async function saveStatus() {
    setSaving(true);
    try {
      await updateTask(task.id, { status: nextStatus });
      toast.success("Task status updated");
    } catch (error) {
      showApiError(error, "Unable to update task status");
    } finally {
      setSaving(false);
    }
  }

  async function submitWork() {
    setSubmitting(true);
    try {
      await updateTask(task.id, {
        submissionText,
        submissionFileName,
        submissionFileUrl,
      });
      toast.success("Submission sent for review");
    } catch (error) {
      showApiError(error, "Unable to save submission");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25 }}
      className="task-card task-card-hover group relative overflow-hidden"
    >
      <img
        src={task.image}
        alt={task.title}
        className="h-52 w-full object-cover transition duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,16,35,0.02),rgba(10,16,35,0.72))]" />
      <div className="absolute left-5 top-5">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[task.status]}`}>
          {task.status}
        </span>
      </div>
      {task.isOverdue ? (
        <div className="absolute right-5 top-5 rounded-full bg-rose-500/90 px-3 py-1 text-xs font-semibold text-white">
          Overdue
        </div>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="font-display text-2xl font-semibold">{task.title}</p>
        <p className="mt-2 text-sm leading-6 text-white/75">{task.description}</p>
        <div className="mt-4 grid gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-sm text-white/78 backdrop-blur">
          {meta.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <span className="text-white/60">{item.label}</span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>

        {user?.role === "user" ? (
          <div className="mt-4 grid gap-4">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-white/65">Task status</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                >
                  {taskStatuses
                    .filter((status) => !["Completed", "Pending Review", "Rejected"].includes(status))
                    .map((status) => (
                      <option key={status} value={status} className="text-slate-900">
                        {status}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={saveStatus}
                  disabled={saving || nextStatus === task.status}
                  className="h-11 rounded-xl border border-white/20 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-white/65">Submission details</p>
              <div className="mt-4 grid gap-3">
                <textarea
                  value={submissionText}
                  onChange={(event) => setSubmissionText(event.target.value)}
                  placeholder="Add a short delivery note or handoff summary."
                  className="min-h-24 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45 transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={submissionFileName}
                    onChange={(event) => setSubmissionFileName(event.target.value)}
                    placeholder="Attachment name"
                    className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/45 transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                  />
                  <input
                    value={submissionFileUrl}
                    onChange={(event) => setSubmissionFileUrl(event.target.value)}
                    placeholder="File URL"
                    className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/45 transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                  />
                </div>
              </div>
            </div>

            {task.review?.feedback ? (
              <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-[0.28em] text-white/65">Admin feedback</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{task.review.feedback}</p>
                {task.review.decision ? (
                  <p className="mt-2 text-xs font-semibold text-white/60">Review: {task.review.decision}</p>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-white/65">Submit action</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
                  Send this task to admin review with your latest notes and file reference.
                </div>
                <button
                  type="button"
                  onClick={submitWork}
                  disabled={submitting}
                  className="h-11 rounded-xl border border-white/20 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit for review"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}
