import { cn } from "../../lib/utils";
import { displayTaskStatus, normalizeTaskStatus, statusTone } from "../../lib/constants";
import { hasUnreadTaskDiscussion, truncateText } from "../../lib/utils";

export default function TaskTable({
  tasks,
  onEdit,
  onDelete,
  onView,
  onApprove,
  onReject,
  theme = "light",
}) {
  function getAiReviewState(task) {
    const score = task.aiEvaluation?.predictedScore;
    const reviewByAi = String(task.review?.reviewedBy || "").toUpperCase() === "AI";

    if (reviewByAi && task.review?.decision === "Approved") {
      return { label: "AI Approved", tone: "emerald" };
    }

    if (reviewByAi && task.review?.decision === "Rejected") {
      return { label: "AI Rejected", tone: "rose" };
    }

    if (score !== undefined && score !== null) {
      if (score >= 80) return { label: "AI Approved", tone: "emerald" };
      if (score < 50) return { label: "AI Rejected", tone: "rose" };
      return { label: "AI Pending Review", tone: "amber" };
    }

    return null;
  }

  function getConfidencePercent(confidence) {
    const value = String(confidence || "").toLowerCase();
    if (value === "high") return 90;
    if (value === "medium") return 65;
    if (value === "low") return 35;
    return 0;
  }

  function getAiReason(task) {
    return (
      task.aiEvaluation?.verdictReason ||
      task.aiEvaluation?.feedback ||
      task.aiEvaluation?.summary ||
      "DTMS generated a score from the submission content and the task brief."
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border backdrop-blur-xl",
        theme === "dark"
          ? "border-white/10 bg-white/5 shadow-[0_22px_60px_rgba(2,6,23,0.42)]"
          : "task-panel",
      )}
    >
      <div className={cn("flex items-center justify-between gap-4 border-b px-6 py-5", theme === "dark" ? "border-white/10" : "border-slate-200/80")}>
        <div>
          <p className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-slate-950")}>Task table</p>
          <p className={cn("mt-1 text-sm", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
            Track assignments, deadlines, approvals, and task actions from one workspace.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className={cn(theme === "dark" ? "bg-white/[0.04] text-slate-400" : "bg-slate-50/80 text-slate-500")}>
            <tr>
              <th className="px-6 py-4 font-medium">Task Image</th>
              <th className="px-6 py-4 font-medium">Title</th>
              <th className="px-6 py-4 font-medium">Team</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Score</th>
              <th className="px-6 py-4 font-medium">Deadline</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={cn(
                  "border-t transition-all duration-300",
                  theme === "dark"
                    ? "border-white/10 hover:bg-white/[0.04]"
                    : "border-slate-200/70 bg-white/45 hover:bg-white/90",
                )}
              >
                <td className="px-6 py-5">
                  <img src={task.image} alt={task.title} className="h-14 w-20 rounded-2xl object-cover shadow-md" />
                </td>
                <td className="px-6 py-5">
                  <p className={cn("font-semibold", theme === "dark" ? "text-white" : "text-slate-950")}>{task.title}</p>
                  {hasUnreadTaskDiscussion(task) ? (
                    <span className="mt-2 inline-flex rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                      New discussion
                    </span>
                  ) : null}
                  <p className={cn("mt-1 max-w-sm text-xs leading-6", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
                    {task.description}
                  </p>
                  {task.discussionMeta?.lastCommentMessage ? (
                    <p className={cn("mt-2 max-w-sm text-xs leading-6", theme === "dark" ? "text-slate-300" : "text-blue-700")}>
                      Latest discussion: {truncateText(task.discussionMeta.lastCommentMessage, 82)}
                    </p>
                  ) : null}
                  {task.review?.feedback ? (
                    <p className={cn("mt-2 max-w-sm text-xs leading-6", theme === "dark" ? "text-slate-300" : "text-slate-600")}>
                      Feedback: {task.review.feedback}
                    </p>
                  ) : null}
                </td>
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <p className={cn("font-semibold", theme === "dark" ? "text-white" : "text-slate-950")}>
                      {task.teamName || task.team?.name || "No team"}
                    </p>
                    <p className={cn("text-xs uppercase tracking-[0.18em]", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
                      {task.assignedUserName || task.assignedUser || "Single user"}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[normalizeTaskStatus(task.status)]}`}>
                      {displayTaskStatus(task.status)}
                    </span>
                    {getAiReviewState(task) ? (
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          getAiReviewState(task).tone === "emerald"
                            ? "bg-emerald-100 text-emerald-700"
                            : getAiReviewState(task).tone === "rose"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {getAiReviewState(task).label}
                      </span>
                    ) : null}
                    {task.review?.decision ? (
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          task.review.decision === "Approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700",
                        )}
                      >
                        {task.review.decision}
                      </span>
                    ) : normalizeTaskStatus(task.status) === "PENDING_REVIEW" ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Awaiting review
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-5">
                  {task.review?.score !== undefined && task.review?.score !== null ? (
                    <div className="flex flex-col gap-2">
                      <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {task.review.score}/100
                      </span>
                      <span className={cn("text-[11px] uppercase tracking-[0.18em]", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
                        Human review
                      </span>
                      {task.aiEvaluation ? (
                        <>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#60a5fa_50%,#f59e0b_100%)]"
                              style={{
                                width: `${getConfidencePercent(task.aiEvaluation.confidence)}%`,
                              }}
                            />
                          </div>
                          <p className={cn("text-xs leading-6", theme === "dark" ? "text-slate-300" : "text-slate-600")}>
                            Why this score? {truncateText(getAiReason(task), 118)}
                          </p>
                        </>
                      ) : null}
                    </div>
                  ) : task.aiEvaluation?.predictedScore !== undefined && task.aiEvaluation?.predictedScore !== null ? (
                    <div className="flex flex-col gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                          task.aiEvaluation.flagged
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700",
                        )}
                      >
                        AI {task.aiEvaluation.predictedScore}/100
                      </span>
                      <span className={cn("text-[11px] uppercase tracking-[0.18em]", theme === "dark" ? "text-slate-400" : "text-slate-500")}>
                        {task.aiEvaluation.confidence || "medium"} confidence
                      </span>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[linear-gradient(90deg,#22c55e_0%,#60a5fa_50%,#f59e0b_100%)]"
                          style={{
                            width: `${getConfidencePercent(task.aiEvaluation.confidence)}%`,
                          }}
                        />
                      </div>
                      {task.aiEvaluation.categoryScores ? (
                        <div className="grid gap-1">
                          <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
                            <div className="bg-sky-500" style={{ width: `${task.aiEvaluation.categoryScores.relevance || 0}%` }} />
                            <div className="bg-emerald-500" style={{ width: `${task.aiEvaluation.categoryScores.completeness || 0}%` }} />
                            <div className="bg-amber-500" style={{ width: `${task.aiEvaluation.categoryScores.structure || 0}%` }} />
                            <div className="bg-violet-500" style={{ width: `${task.aiEvaluation.categoryScores.clarity || 0}%` }} />
                          </div>
                          <p className={cn("text-xs leading-6", theme === "dark" ? "text-slate-300" : "text-slate-600")}>
                            Why this score? {truncateText(getAiReason(task), 118)}
                          </p>
                        </div>
                      ) : (
                        <p className={cn("text-xs leading-6", theme === "dark" ? "text-slate-300" : "text-slate-600")}>
                          Why this score? {truncateText(getAiReason(task), 118)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className={cn("text-sm", theme === "dark" ? "text-slate-300" : "text-slate-500")}>--</span>
                  )}
                </td>
                <td className={cn("px-6 py-5", theme === "dark" ? "text-slate-300" : "text-slate-600")}>{task.dueDate}</td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-3">
                    {onView ? (
                      <button
                        type="button"
                        onClick={() => onView(task)}
                        className={cn(
                          "rounded-2xl px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5",
                          theme === "dark"
                            ? "border border-sky-400/30 bg-sky-100 text-slate-950 hover:bg-sky-200"
                            : "border border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100",
                        )}
                      >
                        View
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="rounded-2xl bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#A855F7] px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(79,70,229,0.22)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      className={cn(
                        "rounded-2xl px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5",
                        theme === "dark"
                          ? "border border-slate-200 bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-100"
                          : "border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white",
                      )}
                    >
                      Delete
                    </button>
                    {onApprove && normalizeTaskStatus(task.status) === "PENDING_REVIEW" ? (
                      <button
                        type="button"
                        onClick={() => onApprove(task)}
                        className="rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(16,185,129,0.22)]"
                      >
                        Approve
                      </button>
                    ) : null}
                    {onReject && normalizeTaskStatus(task.status) === "PENDING_REVIEW" ? (
                      <button
                        type="button"
                        onClick={() => onReject(task)}
                        className="rounded-2xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(244,63,94,0.22)]"
                      >
                        Reject
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
