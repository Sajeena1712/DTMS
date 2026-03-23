export const showcasePanels = [
  {
    title: "Premium hiring workflows",
    copy: "Bring recruiting, approvals, and candidate communication into one polished command center.",
  },
  {
    title: "High-trust access control",
    copy: "Role-aware authentication, password recovery, and email verification designed for modern teams.",
  },
];

export const authVisualStats = [
  { label: "Hiring velocity", value: "+28%" },
  { label: "Candidate response", value: "94%" },
  { label: "Workflow uptime", value: "99.9%" },
];

export const adminNavLinks = [
  { href: "/admin-dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/analytics", label: "Analytics" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
];

export const userNavLinks = [
  { href: "/user-dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/analytics", label: "Analytics" },
  { href: "/team", label: "Team" },
  { href: "/settings", label: "Settings" },
];

export const taskStatusLabels = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  PENDING_REVIEW: "Pending Review",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  Pending: "Pending",
  "In Progress": "In Progress",
  "Pending Review": "Pending Review",
  Completed: "Completed",
  Rejected: "Rejected",
};

export const taskStatuses = ["PENDING", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED", "REJECTED"];

export function normalizeRole(role) {
  return typeof role === "string" ? role.toUpperCase() : "";
}

export function isAdminRole(role) {
  return normalizeRole(role) === "ADMIN";
}

export function isUserRole(role) {
  return normalizeRole(role) === "USER";
}

export function normalizeTaskStatus(status) {
  const map = {
    Pending: "PENDING",
    "In Progress": "IN_PROGRESS",
    "Pending Review": "PENDING_REVIEW",
    Completed: "COMPLETED",
    Rejected: "REJECTED",
  };

  return map[status] || status || "";
}

export function displayTaskStatus(status) {
  return taskStatusLabels[status] || status || "Unknown";
}

export const priorityTone = {
  LOW: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-rose-100 text-rose-700",
};

export function normalizePriority(priority) {
  return typeof priority === "string" ? priority.toUpperCase() : "MEDIUM";
}

export function displayPriority(priority) {
  const normalized = normalizePriority(priority);
  return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

export const taskVisuals = [
  "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
];

export const statusTone = {
  PENDING: "bg-amber-100/80 text-amber-700",
  IN_PROGRESS: "bg-sky-100/85 text-sky-700",
  PENDING_REVIEW: "bg-violet-100/85 text-violet-700",
  COMPLETED: "bg-emerald-100/85 text-emerald-700",
  REJECTED: "bg-rose-100/85 text-rose-700",
  Pending: "bg-amber-100/80 text-amber-700",
  "In Progress": "bg-sky-100/85 text-sky-700",
  "Pending Review": "bg-violet-100/85 text-violet-700",
  Completed: "bg-emerald-100/85 text-emerald-700",
  Rejected: "bg-rose-100/85 text-rose-700",
};
