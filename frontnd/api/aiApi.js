import api, { safeRequest } from "./client";

export async function generateTaskDescription(payload) {
  return safeRequest(() => api.post("/ai/task-description", payload), "Unable to generate task draft");
}

export async function getAiSettings() {
  return safeRequest(() => api.get("/ai/settings"), "Unable to load AI settings");
}

export async function updateAiSettings(payload) {
  return safeRequest(() => api.put("/ai/settings", payload), "Unable to save AI settings");
}

export async function evaluateSubmission(payload) {
  return safeRequest(() => api.post("/ai/evaluate-submission", payload), "Unable to evaluate submission");
}
