import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { showApiError } from "../../api/client";
import { displayTaskStatus, normalizeTaskStatus, statusTone } from "../../lib/constants";
import { formatDate } from "../../lib/utils";

const reviewOptions = [
  { value: "Approved", label: "Approve" },
  { value: "Rejected", label: "Reject" },
];

export default function TaskReviewModal({ open, task, onClose, onSubmit, initialDecision = "Approved" }) {
  const [decision, setDecision] = useState(initialDecision);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !task) {
      return;
    }

    setDecision(initialDecision);
    setScore(task.review?.score ?? "");
    setFeedback(task.review?.feedback ?? "");
    setError("");
  }, [initialDecision, open, task]);

  if (!open || !task) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const parsedScore = Number(score);

    if (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      setError("Please enter a score between 0 and 100.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await onSubmit(task.id, {
        reviewDecision: decision,
        reviewScore: parsedScore,
        reviewFeedback: feedback.trim(),
      });
      onClose();
    } catch (submitError) {
      const message = submitError?.message || "Unable to save review";
      setError(message);
      showApiError(submitError, message);
    } finally {
      setSaving(false);
    }
  }

  const status = normalizeTaskStatus(task.status);

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
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-slate-200/20 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_48%,#f5f7fb_100%)] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.32)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Review task</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-slate-950">{task.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Score the submission, leave feedback, and send the review back to the user automatically.
            </p>
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
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>
            {displayTaskStatus(status)}
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Admin review only
          </span>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Scorecard</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Decision</span>
                <select
                  value={decision}
                  onChange={(event) => setDecision(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-300"
                >
                  {reviewOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Score</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={score}
                  onChange={(event) => setScore(event.target.value)}
                  placeholder="0 - 100"
                  className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Feedback</span>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Leave a short note explaining the score."
                className="min-h-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300"
              />
            </label>
          </div>

          <div className="rounded-[28px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Submission context</p>
            <p className="mt-3 text-sm leading-7 text-slate-700">{task.submission?.text || "No submission note available."}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Deadline</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(task.deadline)}</p>
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

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">The user will receive an email with the score after you submit.</p>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[linear-gradient(90deg,#2563EB_0%,#7C3AED_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(87,83,255,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save review"}
            </button>
          </div>
        </form>
      </motion.aside>
    </div>
  );
}
