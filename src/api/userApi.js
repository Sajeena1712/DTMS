import api, { safeRequest } from "./client";

export async function fetchUsers() {
  return safeRequest(() => api.get("/user/"), "Unable to load users");
}

export async function fetchDashboard() {
  return safeRequest(() => api.get("/user/dashboard"), "Unable to load dashboard");
}

