import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import api, { safeRequest } from "../api/client";
import { normalizeTaskStatus, taskVisuals } from "../lib/constants";
import { formatDate } from "../lib/utils";
import { useAuth } from "./AuthContext";


const TaskContext = createContext(null);

function decorateTasks(tasks) {
  return (tasks ?? []).map((task, index) => {
    const assignedName = task.assignedUser?.name || task.assignedUser || "Unassigned";
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
  const [refetchTrigger, setRefetchTrigger] = useState(0);

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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const refetch = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  const createTask = async (payload) => {
    const data = await safeRequest(
      () => api.post("/tasks", payload),
      "Failed to create task",
    );
    const nextTask = decorateTasks([data.task])[0];
    setTasks((current) => [nextTask, ...current]);
    await refetch();
    return nextTask;
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

  const value = useMemo(
    () => ({ tasks, loading, createTask, updateTask, deleteTask, refetch }),
    [tasks, loading, refetch],
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
