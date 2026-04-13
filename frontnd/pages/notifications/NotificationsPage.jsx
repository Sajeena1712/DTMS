import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import MetricCard from "../../components/dashboard/MetricCard";
import DiscussionNotifications from "../../components/dashboard/DiscussionNotifications";
import { useTasks } from "../../contexts/TaskContext";
import { useAuth } from "../../contexts/AuthContext";
import { normalizeTaskStatus } from "../../lib/constants";
import { markTaskDiscussionRead } from "../../lib/utils";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { tasks, workspaceNotice, markWorkspaceNoticeSeen } = useTasks();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const taskId = searchParams.get("task");
  const selectedTask = useMemo(
    () => tasks.find((task) => String(task.id) === String(taskId)) || null,
    [taskId, tasks],
  );

  const uploadItems = workspaceNotice?.items || [];
  const unreadDiscussionCount = useMemo(
    () => tasks.filter((task) => (task?.discussionMeta?.commentCount || 0) > 0).length,
    [tasks],
  );

  function openTask(task) {
    if (!task?.id) {
      return;
    }

    markWorkspaceNoticeSeen();
    markTaskDiscussionRead(task.id);
    navigate(`/tasks?task=${task.id}`);
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="task-panel p-6 sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.32em] text-blue-500">Notifications</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Uploads and comments</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Task uploads and comment notifications live here separately from the task page.
        </p>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Task uploads"
          value={uploadItems.length}
          detail="New tasks uploaded by admin."
          accent={uploadItems.length ? "cyan" : "slate"}
        />
        <MetricCard
          label="Comment threads"
          value={unreadDiscussionCount}
          detail="Tasks with active discussion updates."
          accent={unreadDiscussionCount ? "green" : "slate"}
        />
        <MetricCard
          label="Current user"
          value={user?.name || "User"}
          detail="Signed-in workspace member."
          accent="violet"
        />
        <MetricCard
          label="Selected task"
          value={selectedTask ? "Open" : "None"}
          detail={selectedTask ? selectedTask.title : "Use ?task=ID to focus a task."}
          accent={selectedTask ? "emerald" : "amber"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="task-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Task uploads</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">New submissions and assignments</h2>
            </div>
            <button
              type="button"
              onClick={markWorkspaceNoticeSeen}
              className="rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              Mark uploads seen
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {uploadItems.length ? (
              uploadItems.map(({ task, timestamp }) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openTask(task)}
                  className="w-full rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_16px_36px_rgba(59,130,246,0.10)]"
                >
                  <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    New task uploaded. Open it to review the assignment details.
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{timestamp ? new Date(timestamp).toLocaleString() : ""}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Open task
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <p className="text-sm font-semibold text-slate-950">No uploads yet</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">New task uploads will appear here.</p>
              </div>
            )}
          </div>
        </article>

        <DiscussionNotifications
          tasks={tasks}
          title="Comment notifications"
          description="Open task discussions here instead of inside the task page."
          emptyTitle="No comment notifications"
          emptyDescription="There are no active comment threads right now."
          onOpenTask={openTask}
        />
      </section>

      <section className="task-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Focused task</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Selected notification target</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50"
          >
            Open tasks
          </button>
        </div>

        <div className="mt-5 rounded-[28px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
          <p className="text-sm font-semibold text-slate-950">{selectedTask?.title || "No task selected"}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {selectedTask
              ? `Open this task from notifications to review the submission or discussion.`
              : "Use the notification cards above to focus a task."}
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.24em] text-blue-700">
            Status: {selectedTask ? normalizeTaskStatus(selectedTask.status) : "None"}
          </p>
        </div>
      </section>
    </div>
  );
}
