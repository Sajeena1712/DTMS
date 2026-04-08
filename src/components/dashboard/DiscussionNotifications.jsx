import { hasUnreadTaskDiscussion, truncateText } from "../../lib/utils";

function formatRelativeTime(value) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function NotificationItem({ task, onClick }) {
  const commentCount = task?.discussionMeta?.commentCount || 0;
  const lastCommentAt = task?.discussionMeta?.lastCommentAt;
  const preview = truncateText(task?.discussionMeta?.lastCommentMessage, 94);
  const author = task?.discussionMeta?.lastCommentAuthorName || "Discussion update";
  const isUnread = hasUnreadTaskDiscussion(task);

  return (
    <button
      type="button"
      onClick={() => onClick?.(task)}
      className="w-full rounded-[22px] border border-slate-200/80 bg-white/85 px-4 py-4 text-left shadow-[0_14px_40px_rgba(148,163,184,0.08)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_18px_48px_rgba(59,130,246,0.12)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600 shadow-[0_0_0_6px_rgba(37,99,235,0.12)]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-950">{task.title}</p>
            <span className={isUnread ? "rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500"}>
              {isUnread ? "Unread" : "Read"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            <span className="font-semibold text-slate-800">{author}:</span>{" "}
            {preview || "A new comment was added to this task thread."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>Updated {formatRelativeTime(lastCommentAt)}</span>
            <span>
              {commentCount} comment{commentCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function DiscussionNotifications({
  tasks = [],
  onOpenTask,
  title = "Discussion notifications",
  description = "Unread task threads are surfaced here so admins and users can jump back into active conversations.",
  emptyTitle = "No discussion updates",
  emptyDescription = "There are no comment threads to show right now.",
}) {
  const discussionTasks = tasks
    .filter((task) => (task?.discussionMeta?.commentCount || 0) > 0)
    .sort((a, b) => new Date(b?.discussionMeta?.lastCommentAt || 0) - new Date(a?.discussionMeta?.lastCommentAt || 0));
  const unreadTasks = discussionTasks.filter((task) => hasUnreadTaskDiscussion(task));

  return (
    <section className="task-panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Notifications</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{description}</p>
        </div>
        <div className="rounded-[22px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-blue-500">Threads</p>
          <p className="mt-1 text-3xl font-semibold text-slate-950">{discussionTasks.length}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {discussionTasks.length ? (
          discussionTasks.slice(0, 4).map((task) => <NotificationItem key={task.id} task={task} onClick={onOpenTask} />)
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
            <p className="text-sm font-semibold text-slate-950">{emptyTitle}</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">{emptyDescription}</p>
          </div>
        )}
      </div>
    </section>
  );
}
