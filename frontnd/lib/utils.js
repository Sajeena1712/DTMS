export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatPercent(value) {
  return `${Math.round(value)}%`;
}

export function formatDate(value) {
  if (!value) return "--";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function truncateText(value, maxLength = 90) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function getTaskDiscussionReadKey(taskId) {
  return `dtms_task_discussion_read_${taskId}`;
}

export function getTaskDiscussionLastReadAt(taskId) {
  if (!taskId || typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(getTaskDiscussionReadKey(taskId));
  if (!stored) {
    return null;
  }

  const date = new Date(stored);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function markTaskDiscussionRead(taskId, timestamp = new Date()) {
  if (!taskId || typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getTaskDiscussionReadKey(taskId), new Date(timestamp).toISOString());
}

export function hasUnreadTaskDiscussion(task) {
  const lastCommentAt = task?.discussionMeta?.lastCommentAt;
  if (!task?.id || !lastCommentAt) {
    return false;
  }

  const lastReadAt = getTaskDiscussionLastReadAt(task.id);
  if (!lastReadAt) {
    return true;
  }

  return new Date(lastCommentAt).getTime() > lastReadAt.getTime();
}
