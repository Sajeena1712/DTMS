import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api, { safeRequest } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionLabel, setActionLabel] = useState("Initializing DTMS...");

  async function runWithLoader(label, work) {
    setActionLabel(label);
    setActionLoading(true);

    try {
      return await work();
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    async function loadSession() {
      const token = localStorage.getItem("dtms_token");

      if (!token) {
        setBooting(false);
        return;
      }

      try {
        const data = await safeRequest(() => api.get("/auth/me"), "Unable to restore session");
        setUser(data.user);
      } catch {
        localStorage.removeItem("dtms_token");
        setUser(null);
      } finally {
        setBooting(false);
      }
    }

    loadSession();
  }, []);

  const login = async (payload) => {
    return runWithLoader("Initializing DTMS...", async () => {
      const data = await safeRequest(() => api.post("/login", payload), "Login failed");
      localStorage.setItem("dtms_token", data.token);
      setUser(data.user);
      toast.success("Signed in successfully");
      return data;
    });
  };

  const register = async (payload) => {
    return runWithLoader("Creating your DTMS account...", async () => {
      const data = await safeRequest(() => api.post("/auth/register", payload), "Registration failed");
      toast.success(data.message);
      return data;
    });
  };

  const verifyEmail = async (token) => {
    return runWithLoader("Verifying secure access...", async () => {
      const data = await safeRequest(
        () => api.get(`/auth/verify-email/${token}`),
        "Email verification failed",
      );
      toast.success(data.message || "Email verified");
      return data;
    });
  };

  const forgotPassword = async (payload) => {
    return runWithLoader("Starting password recovery...", async () => {
      const data = await safeRequest(
        () => api.post("/auth/forgot-password", payload),
        "Unable to start password recovery",
      );
      toast.success(data.message);
      return data;
    });
  };

  const resetPassword = async (payload) => {
    return runWithLoader("Updating your secure password...", async () => {
      const data = await safeRequest(
        () => api.post("/auth/reset-password", payload),
        "Unable to reset password",
      );
      toast.success(data.message);
      return data;
    });
  };

  const logout = async () => {
    return runWithLoader("Signing out of DTMS...", async () => {
      try {
        await api.post("/auth/logout");
      } catch {
        // Swallow logout failures and clear the local session anyway.
      }

      localStorage.removeItem("dtms_token");
      setUser(null);
      toast.success("Signed out");
    });
  };

  const value = useMemo(
    () => ({
      user,
      booting,
      actionLoading,
      actionLabel,
      isAuthenticated: Boolean(user),
      login,
      register,
      verifyEmail,
      forgotPassword,
      resetPassword,
      logout,
    }),
    [user, booting, actionLoading, actionLabel],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
