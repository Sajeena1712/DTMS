/**
 * Auth API - All authentication-related API calls
 * This file contains pure API calls without UI logic
 * Keep components UI-focused, let pages handle the integration
 */

import api, { safeRequest } from "./client";

/**
 * Register a new user
 * @param {Object} credentials - { name, email, password, confirmPassword }
 * @returns {Promise} - { message, user }
 */
export async function registerUser(credentials) {
  return safeRequest(
    () => api.post("/auth/register", credentials),
    "Registration failed. Try a different email or password."
  );
}

/**
 * Login user
 * @param {Object} credentials - { email, password }
 * @returns {Promise} - { token, user }
 */
export async function loginUser(credentials) {
  return safeRequest(
    () => api.post("/auth/login", credentials),
    "Invalid email or password"
  );
}

/**
 * Get current authenticated user
 * @returns {Promise} - { user }
 */
export async function getCurrentUser() {
  return safeRequest(
    () => api.get("/auth/me"),
    "Failed to fetch user info"
  );
}

/**
 * Request password reset email
 * @param {string} email - User email
 * @returns {Promise} - { message }
 */
export async function requestPasswordReset(email) {
  return safeRequest(
    () => api.post("/auth/forgot-password", { email }),
    "Failed to send reset email. Check your email address."
  );
}

/**
 * Reset password with token
 * @param {string} token - Reset token from email
 * @param {Object} passwords - { newPassword, confirmPassword }
 * @returns {Promise} - { message }
 */
export async function resetPassword(token, passwords) {
  return safeRequest(
    () => api.post(`/auth/reset-password/${token}`, passwords),
    "Password reset failed. Try again or request a new link."
  );
}

/**
 * Verify email with token
 * @param {string} token - Verification token from email
 * @returns {Promise} - { message }
 */
export async function verifyEmail(token) {
  return safeRequest(
    () => api.get(`/auth/verify-email/${token}`),
    "Email verification failed. The link may have expired."
  );
}

/**
 * Logout user (clear tokens)
 * @returns {void}
 */
export function logoutUser() {
  localStorage.removeItem("dtms_token");
}
