import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import TaskCard from "../../components/tasks/TaskCard";
import TaskModal from "../../components/tasks/TaskModal";
import TaskSubmissionModal from "../../components/tasks/TaskSubmissionModal";
import TaskProgressModal from "../../components/tasks/TaskProgressModal";
import TaskTable from "../../components/dashboard/TaskTable";
import { showApiError } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";
import { displayTaskStatus, isAdminRole, taskStatuses } from "../../lib/constants";

export default function TaskListPage() {
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [workingTask, setWorkingTask] = useState(null);
  const [openedNotificationTaskId, setOpenedNotificationTaskId] = useState("");

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [task.title, task.description, task.assignedUserName, task.teamName, displayTaskStatus(task.status)]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, tasks]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskId = params.get("task");

    if (!taskId || taskId === openedNotificationTaskId || !tasks.length) {
      return;
    }

    const targetTask = tasks.find((task) => String(task.id) === String(taskId));
    if (!targetTask) {
      return;
    }

    if (isAdmin) {
      setViewingTask(targetTask);
    } else {
      setWorkingTask(targetTask);
    }

    setOpenedNotificationTaskId(taskId);
    navigate("/tasks", { replace: true });
  }, [location.search, tasks, isAdmin, navigate, openedNotificationTaskId]);

  async function handleDelete(taskId) {
    try {
      await deleteTask(taskId);
      toast.success("Task deleted");
    } catch (error) {
      showApiError(error, "Failed to delete task");
    }
  }

  async function handleCreate(values) {
    try {
      const result = await createTask(values);
      toast.success(
        result?.count && result.count > 1
          ? `Task assigned to ${result.count} students`
          : "Task created",
      );
      setModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      showApiError(error, "Failed to create task");
      throw error;
    }
  }

  async function handleUpdate(values) {
    try {
      await updateTask(editingTask.id, values);
      toast.success("Task updated");
      setModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      showApiError(error, "Failed to update task");
      throw error;
    }
  }

  async function handleApprove(task) {
    const feedback = window.prompt("Approval feedback for the user (optional):", task.review?.feedback ?? "") ?? "";

    try {
      await updateTask(task.id, {
        reviewDecision: "Approved",
        reviewFeedback: feedback,
      });
      toast.success("Task approved");
    } catch (error) {
      showApiError(error, "Failed to approve task");
    }
  }

  async function handleReject(task) {
    const feedback = window.prompt("Enter rejection feedback for the user:", task.review?.feedback ?? "");
    if (feedback === null) {
      return;
    }

    try {
      await updateTask(task.id, {
        reviewDecision: "Rejected",
        reviewFeedback: feedback,
      });
      toast.success("Task rejected");
    } catch (error) {
      showApiError(error, "Failed to reject task");
    }
  }

  function openCreateModal() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function openViewModal(task) {
    setViewingTask(task);
  }

  function openTaskForm(task) {
    if (task.isOverdue && !task.canOpenAfterDeadline) {
      toast.error("This task deadline has passed. Ask an admin to add a late submission reason.");
      return;
    }

    setWorkingTask(task);
  }

  if (viewingTask) {
    return (
      <TaskSubmissionModal
        open={Boolean(viewingTask)}
        task={viewingTask}
        onClose={() => setViewingTask(null)}
      />
    );
  }

  if (workingTask) {
    return (
      <TaskProgressModal
        open={Boolean(workingTask)}
        task={workingTask}
        onClose={() => setWorkingTask(null)}
        onSubmit={updateTask}
      />
    );
  }

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={
          isAdmin
            ? "overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/80 shadow-[0_24px_80px_rgba(148,163,184,0.18)] backdrop-blur-2xl"
            : "task-panel overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,250,252,0.88))]"
        }
      >
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className={isAdmin ? "text-xs uppercase tracking-[0.28em] text-slate-500" : "text-xs uppercase tracking-[0.28em] text-slate-400"}>
              Task workspace
            </p>
            <h1 className={isAdmin ? "mt-4 font-display text-4xl font-semibold text-black" : "mt-4 font-display text-4xl font-semibold text-slate-950"}>
              {isAdmin ? "Manage assignments with clarity" : "Track your assigned work"}
            </h1>
            <p className={isAdmin ? "mt-4 max-w-2xl text-sm leading-7 text-slate-700" : "mt-4 max-w-2xl text-sm leading-7 text-slate-600"}>
              {isAdmin
                ? "Review the task table, approve submissions, and manage updates in one premium workspace."
                : "Search tasks, upload submissions, and follow the approval feedback from admins."}
            </p>
          </div>

          <div className="flex items-start justify-end">
            {isAdmin ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-2xl bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#A855F7] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5"
              >
                + Create Task
              </button>
            ) : null}
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.06, ease: "easeOut" }}
        className={isAdmin ? "rounded-[28px] border border-slate-200/80 bg-white/80 p-6 backdrop-blur-2xl" : "task-panel p-6"}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by task title, description, assignee, or status"
            className={
              isAdmin
                ? "h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-black outline-none placeholder:text-slate-500 focus:border-blue-300"
                : "task-select"
            }
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={
              isAdmin
                ? "h-14 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-black outline-none focus:border-blue-300"
              : "task-select"
            }
          >
            <option value="All" className="text-slate-900">All statuses</option>
            {taskStatuses.map((status) => (
              <option key={status} value={status} className="text-slate-900">
                {displayTaskStatus(status)}
              </option>
            ))}
          </select>
        </div>
      </motion.section>

      {loading ? (
        <section className={isAdmin ? "flex min-h-[40vh] items-center justify-center rounded-[28px] border border-slate-200/80 bg-white/80 p-6 backdrop-blur-2xl" : "task-panel flex min-h-[40vh] items-center justify-center p-6"}>
          <div className={isAdmin ? "h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" : "h-12 w-12 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"} />
        </section>
      ) : filteredTasks.length ? (
        isAdmin ? (
          <TaskTable
            tasks={filteredTasks}
            onView={openViewModal}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
            theme="dark"
          />
        ) : (
          <section className="grid gap-6">
            {filteredTasks.map((task) => (
              <TaskCard key={task.id} task={task} onOpen={openTaskForm} />
            ))}
          </section>
        )
      ) : (
        <section className={isAdmin ? "flex min-h-[40vh] items-center justify-center rounded-[28px] border border-slate-200/80 bg-white/80 p-6 text-center backdrop-blur-2xl sm:p-8" : "glass-panel flex min-h-[40vh] items-center justify-center p-6 text-center sm:p-8"}>
          <div className="max-w-lg">
            <p className={isAdmin ? "text-xs uppercase tracking-[0.28em] text-slate-500" : "text-xs uppercase tracking-[0.28em] text-slate-400"}>No matches</p>
            <h2 className={isAdmin ? "mt-4 font-display text-3xl font-semibold text-black" : "mt-4 font-display text-3xl font-semibold text-slate-950"}>
              No tasks fit this view
            </h2>
            <p className={isAdmin ? "mt-4 text-sm leading-7 text-slate-700" : "mt-4 text-sm leading-7 text-slate-600"}>
              Try a different search or status filter{isAdmin ? ", or create a fresh assignment for your team." : "."}
            </p>
            {isAdmin ? (
              <button type="button" onClick={openCreateModal} className="mt-6 rounded-2xl bg-gradient-to-r from-[#4F46E5] via-[#06B6D4] to-[#A855F7] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(79,70,229,0.22)] transition hover:-translate-y-0.5">
                + Create Task
              </button>
            ) : null}
          </div>
        </section>
      )}

      {isAdmin ? (
        <TaskModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={editingTask ? handleUpdate : handleCreate}
          initialValues={editingTask}
          mode={editingTask ? "edit" : "create"}
        />
      ) : null}
    </div>
  );
}

