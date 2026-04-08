import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { showApiError } from "../../api/client";
import { displayTaskStatus, normalizeTaskStatus, statusTone, taskStatuses } from "../../lib/constants";
import TaskDiscussionPanel from "./TaskDiscussionPanel";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read selected file"));
    reader.readAsDataURL(file);
  });
}

const userStatusOptions = ["PENDING", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED"];

export default function TaskProgressModal({ open, task, onClose, onSubmit }) {
  const [status, setStatus] = useState("PENDING");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lateSubmissionReason = task?.reminders?.lateSubmissionReason?.trim() || "";
  const isLateBlocked =
    Boolean(task?.deadline) &&
    !lateSubmissionReason &&
    new Date(task.deadline).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!open || !task) {
      return;
    }

    setStatus(normalizeTaskStatus(task.status) || "PENDING");
    setNote(task.submission?.text ?? task.description ?? "");
    setLink(task.submission?.fileUrl?.startsWith("http") ? task.submission.fileUrl : "");
    setSelectedFile(null);
    setError("");
  }, [open, task]);

  if (!open || !task) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await onSubmit(task.id, {
        status,
        submissionText: note.trim(),
        submissionFileName: selectedFile?.name || task.submission?.fileName || undefined,
        submissionFileUrl: selectedFile ? undefined : link.trim() || undefined,
        submissionFileData: selectedFile ? await fileToDataUrl(selectedFile) : undefined,
      });
      onClose();
    } catch (submitError) {
      const message = submitError?.message || "Unable to update task progress";
      setError(message);
      showApiError(submitError, message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#020617]/70 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-slate-200/20 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_45%,#f5f7fb_100%)] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.32)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Task progress form</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-slate-950">{task.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Fill in your progress, set the status, and submit the update. This flow is for users only.
            </p>
            {lateSubmissionReason ? (
              <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-700">
                Late submission approved by admin. Reason: {lateSubmissionReason}
              </p>
            ) : isLateBlocked ? (
              <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-700">
                This deadline has passed. The form stays locked until an admin adds a late submission reason.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[normalizeTaskStatus(task.status)]}`}>
            {displayTaskStatus(normalizeTaskStatus(task.status))}
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            User update only
          </span>
        </div>

        <TaskDiscussionPanel taskId={task.id} taskTitle={task.title} compact />

        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Progress</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-300"
                >
                  {userStatusOptions.map((value) => (
                    <option key={value} value={value}>
                      {displayTaskStatus(value)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Submission link</span>
                <input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  placeholder="https://..."
                  disabled={isLateBlocked}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Progress note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Describe what you completed, what is blocked, or what you need next."
                disabled={isLateBlocked}
                className="min-h-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
              />
            </label>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Upload file</span>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.zip"
                onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                disabled={isLateBlocked}
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
              <p className="text-xs text-slate-500">
                Use this to submit supporting files for your update, if needed.
              </p>
            </label>
          </div>

          <div className="rounded-[28px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Task brief</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{task.description || "No task description available."}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Deadline</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{task.dueDate || "--"}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Assigned to</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{task.assignedUserName || task.assignedUser}</p>
              </div>
            </div>
          </div>

          {error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </p>
          ) : null}

          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">What you can update</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Set your progress status, add a note, and attach proof of work. Admins will review the submitted update afterward.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">Click submit when you are ready to send the update.</p>
            <button
              type="submit"
              disabled={saving || isLateBlocked}
              className="rounded-2xl bg-[linear-gradient(90deg,#2563EB_0%,#7C3AED_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(87,83,255,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Submitting..." : isLateBlocked ? "Locked by deadline" : "Submit update"}
            </button>
          </div>
        </form>
      </motion.aside>
    </div>
  );
}
