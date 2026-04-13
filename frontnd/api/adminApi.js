import api, { safeRequest } from "./client";

export async function fetchTeams() {
  return safeRequest(() => api.get("/teams"), "Unable to load teams");
}

export async function fetchTeamMembers(teamId) {
  return safeRequest(() => api.get(`/teams/${teamId}/members`), "Unable to load team members");
}

export async function createTeam(payload) {
  return safeRequest(() => api.post("/teams", payload), "Unable to create team");
}

export async function updateTeam(teamId, payload) {
  return safeRequest(() => api.put(`/teams/${teamId}`, payload), "Unable to update team");
}

export async function deleteTeam(teamId) {
  return safeRequest(() => api.delete(`/teams/${teamId}`), "Unable to delete team");
}

export async function moveTeamMember(teamId, userId, payload) {
  return safeRequest(() => api.patch(`/teams/${teamId}/members/${userId}`, payload), "Unable to update team member");
}

export async function fetchAdminSummary() {
  return safeRequest(() => api.get("/teams/summary"), "Unable to load admin summary");
}

export async function createAdminUser(payload) {
  return safeRequest(() => api.post("/user/admin/users", payload), "Unable to create user");
}

export async function bulkCreateAdminUsers(payload) {
  return safeRequest(() => api.post("/user/admin/users/bulk", payload), "Unable to upload users");
}

export async function updateAdminUserTeam(userId, payload) {
  return safeRequest(() => api.patch(`/user/admin/users/${userId}/team`, payload), "Unable to update user team");
}
