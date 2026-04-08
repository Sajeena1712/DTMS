import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import api, { safeRequest } from "../api/client";
import { normalizeTaskStatus, taskVisuals } from "../lib/constants";
import { formatDate } from "../lib/utils";
import { useAuth } from "./AuthContext";


const TaskContext = createContext(null);

function getWorkspaceNoticeSeenKey(userId) {
  return userId ? `dtms_workspace_notice_seen_${userId}` : null;
}

function resolveTaskTimestamp(task) {
  const value = task?.createdAt || task?.updatedAt || task?.deadline || null;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function decorateTasks(tasks) {
  return (tasks ?? []).map((task, index) => {
    const assignedName = task.assignedUser?.name || task.assignedUser || "Unassigned";
    const teamName = task.team?.name || task.teamName || "";
    const deadline = task.deadline ?? null;
    const dueDate = deadline ? formatDate(deadline) : "--";
    const image = task.image || taskVisuals[index % taskVisuals.length];
    const status = normalizeTaskStatus(task.status);
    const lateSubmissionReason = task.reminders?.lateSubmissionReason?.trim() || "";
    const isOverdue =
      Boolean(deadline) &&
      status !== "COMPLETED" &&
      new Date(deadline).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);

    return {
      ...task,
      status,
      assignedUser: assignedName,
      assignedUserName: assignedName,
      teamName,
      deadline,
      dueDate,
      image,
      isOverdue,
      lateSubmissionReason,
      canOpenAfterDeadline: Boolean(lateSubmissionReason),
    };
  });
}

export function TaskProvider({ children }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticeSeenAt, setNoticeSeenAt] = useState(null);

  const fetchTasks = useCallback(async () => {
    let active = true;

    const token = localStorage.getItem("dtms_token");
    if (!token) {
      if (active) {
        setTasks([]);
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const data = await safeRequest(() => api.get("/tasks"), "Unable to load tasks");
      if (active) {
        setTasks(decorateTasks(data.tasks));
      }
    } catch {
      if (active) {
        setTasks([]);
      }
    } finally {
      if (active) {
        setLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const noticeKey = getWorkspaceNoticeSeenKey(user?.id);
    if (!noticeKey || typeof window === "undefined") {
      setNoticeSeenAt(null);
      return;
    }

    const storedValue = window.localStorage.getItem(noticeKey);
    if (storedValue) {
      const storedDate = new Date(storedValue);
      setNoticeSeenAt(Number.isNaN(storedDate.getTime()) ? null : storedDate);
      return;
    }

    const latestTaskTimestamp = tasks
      .map((task) => resolveTaskTimestamp(task))
      .filter(Boolean)
      .sort((left, right) => right.getTime() - left.getTime())[0];

    if (latestTaskTimestamp) {
      window.localStorage.setItem(noticeKey, latestTaskTimestamp.toISOString());
      setNoticeSeenAt(latestTaskTimestamp);
    } else {
      setNoticeSeenAt(null);
    }
  }, [tasks, user?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, user?.id, user?.role]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const refreshOnFocus = () => {
      refetch().catch(() => undefined);
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") {
        refetch().catch(() => undefined);
      }
    };

    const intervalId = window.setInterval(() => {
      refetch().catch(() => undefined);
    }, 30000);

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [refetch, user?.id]);

  const createTask = async (payload) => {
    const data = await safeRequest(
      () => api.post("/tasks", payload),
      "Failed to create task",
    );
    if (data.task) {
      const nextTask = decorateTasks([data.task])[0];
      setTasks((current) => [nextTask, ...current]);
    }
    await refetch();
    return data;
  };

  const updateTask = async (taskId, payload) => {
    const data = await safeRequest(
      () => api.put(`/tasks/${taskId}`, payload),
      "Failed to update task",
    );
    setTasks((current) =>
      current.map((task, index) =>
        task.id === taskId ? decorateTasks([{ ...data.task, image: task.image }], index)[0] : task,
      ),
    );
    await refetch();
    return data.task;
  };

  const deleteTask = async (taskId) => {
    await safeRequest(
      () => api.delete(`/tasks/${taskId}`),
      "Failed to delete task",
    );
    setTasks((current) => current.filter((task) => task.id !== taskId));
    await refetch();
  };

  const markWorkspaceNoticeSeen = useCallback(() => {
    const noticeKey = getWorkspaceNoticeSeenKey(user?.id);
    if (!noticeKey || typeof window === "undefined") {
      return;
    }

    const now = new Date();
    window.localStorage.setItem(noticeKey, now.toISOString());
    setNoticeSeenAt(now);
  }, [user?.id]);

  const workspaceNotice = useMemo(() => {
    const seenAt = noticeSeenAt ? noticeSeenAt.getTime() : 0;
    const newTasks = tasks
      .map((task) => ({ task, timestamp: resolveTaskTimestamp(task) }))
      .filter(({ timestamp }) => timestamp && timestamp.getTime() > seenAt)
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());

    if (!newTasks.length) {
      return { count: 0, title: "", message: "", detail: "", latestTask: null };
    }

    const latestTask = newTasks[0].task;
    const count = newTasks.length;

    return {
      count,
      title: count === 1 ? "New admin update" : "New admin updates",
      message:
        count === 1
          ? `Admin uploaded a new task: ${latestTask.title}`
          : `${count} new tasks were uploaded by admin.`,
      detail: "Open the task to view discussion and chat with admin.",
      latestTask,
    };
  }, [noticeSeenAt, tasks]);

  const value = useMemo(
    () => ({ tasks, loading, createTask, updateTask, deleteTask, refetch, workspaceNotice, markWorkspaceNoticeSeen }),
    [tasks, loading, refetch, workspaceNotice, markWorkspaceNoticeSeen],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const context = useContext(TaskContext);

  if (!context) {
    throw new Error("useTasks must be used inside TaskProvider");
  }

  return context;
}
