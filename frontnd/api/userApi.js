import api, { safeRequest } from "./client";

export async function fetchUsers() {
  return safeRequest(() => api.get("/user/"), "Unable to load users");
}

export async function fetchDashboard() {
  return safeRequest(() => api.get("/user/dashboard"), "Unable to load dashboard");
}

export async function fetchLeaderboard(period = "all") {
  const params = period && period !== "all" ? { period } : undefined;
  return safeRequest(() => api.get("/user/leaderboard", { params }), "Unable to load leaderboard");
}

export async function updateUserProfile(payload) {
  return safeRequest(() => api.put("/user/profile", payload), "Unable to update profile");
}

