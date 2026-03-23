/**
 * Tasks API - All task-related API calls
 * This file contains pure API calls without UI logic
 * Keep components UI-focused, let pages handle the integration
 */

import api, { safeRequest } from "./client";

/**
 * Fetch all tasks (for current user or admin)
 * @param {Object} options - { status?, assignedTo? } for filtering
 * @returns {Promise} - { tasks: [] }
 */
export async function fetchTasks(options = {}) {
  const params = new URLSearchParams();
  if (options.status) params.append("status", options.status);
  if (options.assignedTo) params.append("assignedTo", options.assignedTo);

  return safeRequest(
    () => api.get(`/tasks?${params.toString()}`),
    "Failed to fetch tasks"
  );
}

/**
 * Get a single task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise} - { task }
 */
export async function fetchTaskById(taskId) {
  return safeRequest(
    () => api.get(`/tasks/${taskId}`),
    "Failed to fetch task details"
  );
}

/**
 * Create a new task (admin only)
 * @param {Object} taskData - { title, description, deadline, assignedTo }
 * @returns {Promise} - { task }
 */
export async function createTask(taskData) {
  return safeRequest(
    () => api.post("/tasks", taskData),
    "Failed to create task"
  );
}

/**
 * Update a task
 * @param {string} taskId - Task ID
 * @param {Object} updates - { title?, description?, deadline?, status?, submission? }
 * @returns {Promise} - { task }
 */
export async function updateTask(taskId, updates) {
  return safeRequest(
    () => api.put(`/tasks/${taskId}`, updates),
    "Failed to update task"
  );
}

/**
 * Update task status
 * @param {string} taskId - Task ID
 * @param {string} status - "Pending" | "In Progress" | "Completed"
 * @returns {Promise} - { task }
 */
export async function updateTaskStatus(taskId, status) {
  return updateTask(taskId, { status });
}

/**
 * Submit task completion
 * @param {string} taskId - Task ID
 * @param {Object} submission - { text, fileName?, fileUrl? }
 * @returns {Promise} - { task }
 */
export async function submitTask(taskId, submission) {
  return updateTask(taskId, { 
    submission: {
      ...submission,
      submittedAt: new Date().toISOString()
    },
    status: "Completed"
  });
}

/**
 * Delete a task (admin only)
 * @param {string} taskId - Task ID
 * @returns {Promise} - { message }
 */
export async function deleteTask(taskId) {
  return safeRequest(
    () => api.delete(`/tasks/${taskId}`),
    "Failed to delete task"
  );
}

/**
 * Get user dashboard stats
 * @returns {Promise} - { stats: { totalTasks, completedTasks, pendingTasks, ... } }
 */
export async function fetchDashboardStats() {
  return safeRequest(
    () => api.get("/user/dashboard"),
    "Failed to fetch dashboard stats"
  );
}
