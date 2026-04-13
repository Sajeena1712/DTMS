import { useTasks } from "../../contexts/TaskContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import DiscussionNotifications from "../dashboard/DiscussionNotifications";
import { markTaskDiscussionRead } from "../../lib/utils";
import { useNotifications } from "../../contexts/NotificationContext";

export default function RightNotificationPanel() {
  const { tasks, workspaceNotice, markWorkspaceNoticeSeen } = useTasks();
  const { closeNotifications } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const taskId = searchParams.get("task");
  const selectedTask = tasks.find((task) => String(task.id) === String(taskId)) || null;

  const uploadItems = workspaceNotice?.items || [];
  const unreadDiscussionCount = tasks.filter((task) => (task?.discussionMeta?.commentCount || 0) > 0).length;

  function openTask(task) {
    if (!task?.id) return;
    markWorkspaceNoticeSeen();
    markTaskDiscussionRead(task.id);
    closeNotifications();
    navigate(`/tasks?task=${task.id}`);
  }

  return (
    <aside className="fixed inset-y-4 right-4 z-50 flex w-[min(500px,calc(100vw-2rem))] min-h-0 flex-col overflow-hidden rounded-[32px] border border-blue-100 bg-white p-7 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={closeNotifications}
            aria-label="Close notifications"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white text-slate-600 transition hover:bg-blue-50 hover:text-slate-950"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto pr-1">
          {uploadItems.length ? (
            <div className="space-y-3">
              {uploadItems.map(({ task, timestamp }) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openTask(task)}
                  className="w-full rounded-2xl border border-slate-200/50 bg-slate-50/50 p-4 text-left transition hover:border-blue-200 hover:bg-white hover:shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">New task uploaded</p>
                  <span className="mt-2 block text-xs text-slate-400">
                    {timestamp ? new Date(timestamp).toLocaleString() : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <DiscussionNotifications
            tasks={tasks}
            onOpenTask={openTask}
            title=""
            description=""
            emptyTitle="No notifications"
            emptyDescription="Check back later for updates."
          />
        </div>
      </div>
    </aside>
  );
}

