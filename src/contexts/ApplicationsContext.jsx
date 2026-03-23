import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { safeRequest } from "../api/client";


const ApplicationsContext = createContext(null);

export function ApplicationsProvider({ children }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadApplications() {
      const token = localStorage.getItem("dtms_token");
      if (!token) {
        if (active) {
          setApplications([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const data = await safeRequest(
          () => api.get("/user/applications"),
          "Unable to load applications",
        );
        if (active) {
          setApplications(data.applications ?? []);
        }
      } catch {
        if (active) {
          setApplications([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadApplications();

    return () => {
      active = false;
    };
  }, []);

  const createApplication = async (payload) => {
    const data = await safeRequest(
      () => api.post("/user/applications", payload),
      "Failed to add application",
    );
    setApplications((current) => [data.application, ...current]);
    return data.application;
  };

  const updateApplication = async (applicationId, payload) => {
    const data = await safeRequest(
      () => api.put(`/user/applications/${applicationId}`, payload),
      "Failed to update application",
    );
    setApplications((current) =>
      current.map((app) => (app.id === applicationId ? data.application : app)),
    );
    return data.application;
  };

  const deleteApplication = async (applicationId) => {
    await safeRequest(
      () => api.delete(`/user/applications/${applicationId}`),
      "Failed to delete application",
    );
    setApplications((current) => current.filter((app) => app.id !== applicationId));
  };

  const value = useMemo(
    () => ({ applications, loading, createApplication, updateApplication, deleteApplication }),
    [applications, loading],
  );

  return <ApplicationsContext.Provider value={value}>{children}</ApplicationsContext.Provider>;
}

export function useApplications() {
  const context = useContext(ApplicationsContext);

  if (!context) {
    throw new Error("useApplications must be used inside ApplicationsProvider");
  }

  return context;
}

