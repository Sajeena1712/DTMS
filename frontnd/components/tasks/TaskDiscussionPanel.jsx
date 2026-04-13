import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { resolveApiUrl, showApiError } from "../../api/client";
import { createTaskComment, deleteTaskComment, fetchTaskComments, updateTaskComment } from "../../api/taskApi";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";
import { cn, markTaskDiscussionRead } from "../../lib/utils";

function formatCommentTime(value) {
  if (!value) {
    return "--";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeTime(value) {
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

function initialsFromName(name = "") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function flattenComments(items = []) {
  const result = [];
  const walk = (nodes, depth = 0) => {
    nodes.forEach((node) => {
      result.push({ ...node, depth });
      if (node.replies?.length) {
        walk(node.replies, depth + 1);
      }
    });
  };
  walk(items);
  return result;
}

function CommentAvatar({ author }) {
  const avatar = resolveApiUrl(author?.avatar);
  const initials = initialsFromName(author?.name || author?.email || "User");

  if (avatar) {
    return (
      <div className="h-11 w-11 overflow-hidden rounded-2xl border border-white/60 bg-slate-100 shadow-sm">
        <img src={avatar} alt={author?.name || "User avatar"} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_60%,#ffffff_100%)] text-sm font-semibold text-blue-700 shadow-sm">
      {initials || "U"}
    </div>
  );
}

function CommentItem({
  comment,
  depth = 0,
  onReply,
  activeReplyId,
  onEdit,
  onDelete,
  onEditChange,
  editingId,
  editDraft,
  savingEdit,
  canManage = false,
}) {
  const isEditing = editingId === comment.id;

  return (
    <div className={cn("rounded-[24px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)]", depth > 0 && "ml-4 border-l-4 border-l-blue-100")}>
      <div className="flex items-start gap-3">
        <CommentAvatar author={comment.author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-950">{comment.author?.name || "Unknown user"}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {comment.author?.role || "User"}
            </span>
            <span className="text-xs text-slate-400">{formatCommentTime(comment.createdAt)}</span>
            <span className="text-xs text-slate-400">{formatRelativeTime(comment.createdAt)}</span>
            {comment.editedAt ? (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                Edited
              </span>
            ) : null}
          </div>

          {isEditing ? (
            <div className="mt-3">
              <textarea
                value={editDraft}
                onChange={(event) => onEditChange(comment.id, event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEdit(comment, "save")}
                  disabled={savingEdit}
                  className="rounded-full bg-[linear-gradient(90deg,#2563EB_0%,#7C3AED_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingEdit ? "Saving" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(comment, "cancel")}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{comment.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onReply(comment)}
                  className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600 transition hover:text-blue-700"
                >
                  Reply
                </button>
                {activeReplyId === comment.id ? (
                  <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Replying
                  </span>
                ) : null}
                {canManage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onEdit(comment, "start")}
                      className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 transition hover:text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(comment)}
                      className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500 transition hover:text-rose-600"
                    >
                      Delete
                    </button>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {comment.replies?.length ? (
        <div className="mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              activeReplyId={activeReplyId}
              onEdit={onEdit}
              onDelete={onDelete}
              onEditChange={onEditChange}
              editingId={editingId}
              editDraft={editDraft}
              savingEdit={savingEdit}
              canManage={canManage}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function TaskDiscussionPanel({ taskId, taskTitle, open = true, compact = false }) {
  const { user } = useAuth();
  const { refetch } = useTasks();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalComments = useMemo(() => {
    const flat = flattenComments(comments);
    return flat.length;
  }, [comments]);

  function refreshTaskLists() {
    if (typeof refetch === "function") {
      refetch().catch(() => undefined);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadComments() {
      if (!open || !taskId) {
        setComments([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const data = await fetchTaskComments(taskId);
        if (active) {
          setComments(data.comments || []);
          markTaskDiscussionRead(taskId, new Date());
        }
      } catch (fetchError) {
        if (active) {
          setComments([]);
          setError(fetchError?.message || "Unable to load discussion");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadComments();

    return () => {
      active = false;
    };
  }, [open, taskId]);

  async function handleSubmit(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !taskId) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const data = await createTaskComment(taskId, { message, parentId: replyTo?.id || null });
      setComments(data.comments || []);
      setDraft("");
      setReplyTo(null);
      markTaskDiscussionRead(taskId, new Date());
      refreshTaskLists();
    } catch (submitError) {
      const messageText = submitError?.message || "Unable to post comment";
      setError(messageText);
      showApiError(submitError, messageText);
    } finally {
      setSaving(false);
    }
  }

  function canManageComment(comment) {
    return user?.role === "ADMIN" || String(comment?.author?.id || "") === String(user?.id || "");
  }

  function handleEditChange(commentId, value) {
    if (editingId === commentId) {
      setEditDraft(value);
    }
  }

  function startEdit(comment) {
    setEditingId(comment.id);
    setEditDraft(comment.message || "");
    setReplyTo(null);
  }

  async function handleEdit(comment, action) {
    if (action === "cancel") {
      setEditingId("");
      setEditDraft("");
      return;
    }

    if (action !== "save") {
      startEdit(comment);
      return;
    }

    const nextMessage = editDraft.trim();
    if (!nextMessage) {
      setError("Comment cannot be empty.");
      return;
    }

    setSavingEdit(true);
    setError("");

    try {
      const data = await updateTaskComment(taskId, comment.id, { message: nextMessage });
      setComments(data.comments || []);
      setEditingId("");
      setEditDraft("");
      markTaskDiscussionRead(taskId, new Date());
      refreshTaskLists();
      toast.success("Comment updated");
    } catch (submitError) {
      const messageText = submitError?.message || "Unable to update comment";
      setError(messageText);
      showApiError(submitError, messageText);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(comment) {
    if (!canManageComment(comment)) {
      return;
    }

    const confirmed = window.confirm("Delete this comment and its replies?");
    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const data = await deleteTaskComment(taskId, comment.id);
      setComments(data.comments || []);
      markTaskDiscussionRead(taskId, new Date());
      refreshTaskLists();
      if (editingId === comment.id) {
        setEditingId("");
        setEditDraft("");
      }
      if (replyTo?.id === comment.id) {
        setReplyTo(null);
      }
      toast.success("Comment deleted");
    } catch (deleteError) {
      const messageText = deleteError?.message || "Unable to delete comment";
      setError(messageText);
      showApiError(deleteError, messageText);
    }
  }

  if (!open || !taskId) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={cn(
        "rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_52%,#f5f7fb_100%)] p-5 shadow-[0_20px_60px_rgba(148,163,184,0.12)]",
        compact ? "mt-6" : "",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Task discussion</p>
          <h3 className="mt-2 font-display text-2xl font-semibold text-slate-950">Comments and replies</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Users and admins can discuss the task, leave feedback, and keep the thread visible under every task.
          </p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Thread count</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{totalComments}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 rounded-[26px] border border-slate-200/80 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">{replyTo ? `Replying to ${replyTo.author?.name || "comment"}` : "Add a new comment"}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
              {replyTo ? "This reply will stay in the same task thread." : `Task: ${taskTitle || "Discussion"}`}
            </p>
          </div>
          {replyTo ? (
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancel reply
            </button>
          ) : null}
        </div>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Share an update, ask a question, or leave review notes..."
          className="mt-4 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white"
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-6 text-slate-500">
            Timestamps are recorded automatically and replies are nested under the original comment.
          </p>
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="rounded-2xl bg-[linear-gradient(90deg,#2563EB_0%,#7C3AED_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(87,83,255,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Posting..." : "Post comment"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </p>
      ) : null}

      <div className="mt-5">
        {loading ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 p-8 text-center text-sm text-slate-500">
            Loading discussion...
          </div>
        ) : comments.length ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={setReplyTo}
                activeReplyId={replyTo?.id || null}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onEditChange={handleEditChange}
                editingId={editingId}
                editDraft={editDraft}
                savingEdit={savingEdit}
                canManage={canManageComment(comment)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 p-8 text-center">
            <p className="text-sm font-semibold text-slate-950">No comments yet</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Start the conversation with a note, question, or review update.
            </p>
          </div>
        )}
      </div>
    </motion.section>
  );
}
