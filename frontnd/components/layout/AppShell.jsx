import { NavLink, useNavigate } from "react-router-dom";
import RightNotificationPanel from "../ui/RightNotificationPanel";
import { adminNavLinks, userNavLinks } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { resolveApiUrl } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useTasks } from "../../contexts/TaskContext";
import { assetPath } from "../../lib/assetPaths";

const navIcons = {
  Dashboard: "D",
  Leaderboard: "LB",
  Tasks: "T",
  Rounds: "R",
  Calendar: "C",
  Analytics: "A",
  Team: "TM",
  Settings: "S",
};

export default function AppShell({ children, variant }) {
  const { user, logout } = useAuth();
  const { workspaceNotice, markWorkspaceNoticeSeen } = useTasks();
  const navigate = useNavigate();
  const { openNotifications, closeNotifications, isNotificationOpen } = useNotifications();
  const visibleLinks = variant === "admin" ? adminNavLinks : userNavLinks;
  const profileImage = resolveApiUrl(user?.profilePhoto);
  const notificationCount = workspaceNotice?.count || 0;

  function openWorkspaceUpdates(task = null) {
    markWorkspaceNoticeSeen();
    openNotifications();
    navigate(task?.id ? `/notifications?task=${task.id}` : "/notifications");
  }

  return (
    <div className="relative h-screen overflow-hidden bg-slate-950 px-4 py-4 md:px-6 lg:px-8">
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
        <source src={assetPath("workspace-bg.mp4")} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(239,246,255,0.88)_0%,rgba(248,251,255,0.86)_40%,rgba(255,255,255,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_30%)]" />

      <div className="relative z-10 mx-auto grid h-full max-w-[1800px] gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-blue-100 bg-white p-6 shadow-[0_20px_60px_rgba(59,130,246,0.10)]">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="rounded-[28px] bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_rgba(59,130,246,0.18)]">
                  <img
                    src={profileImage || assetPath("logo.png")}
                    alt={user?.name || "DTMS profile"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Logged in</p>
                  <p className="mt-2 text-base font-semibold text-slate-950">{user?.name || "DTMS User"}</p>
                  <p className="mt-1 text-xs text-slate-600">{user?.email}</p>
                </div>
              </div>
            </div>

            <nav className="mt-8 flex-1 space-y-2 overflow-y-auto pr-1">
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300",
                      isActive
                        ? "bg-[linear-gradient(135deg,#2563eb_0%,#3b82f6_55%,#60a5fa_100%)] text-white shadow-[0_16px_40px_rgba(59,130,246,0.24)]"
                        : "text-slate-700 hover:bg-blue-50 hover:text-black",
                    )
                  }
                >
                  {({ isActive }) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl text-[11px]", isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")}>
                          {navIcons[link.label] ?? "*"}
                        </span>
                        <span>{link.label}</span>
                      </div>
                      {variant !== "admin" && link.label === "Tasks" && workspaceNotice?.count > 0 ? (
                        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700")}>
                          {workspaceNotice.count}
                        </span>
                      ) : null}
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-4 shrink-0 rounded-[24px] border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Workspace</p>
            <p className="mt-3 text-lg font-semibold text-black">{user?.name}</p>
            <p className="mt-1 text-sm text-slate-600">{user?.email}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(59,130,246,0.18)] transition hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-5">
          <header className="flex flex-col gap-4 rounded-[32px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(59,130,246,0.08)] xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl rounded-[36px] bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] px-8 py-7 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-blue-500">
                DTMS
              </p>
              <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Lead with clarity. Deliver with purpose.
              </h1>
              <p className="mt-3 font-display text-lg italic text-slate-600 sm:text-xl">
                Every great workflow starts with a calm mind and a bold next step.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={openWorkspaceUpdates}
                aria-label="Open notifications"
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-white text-slate-800 shadow-[0_12px_32px_rgba(59,130,246,0.08)] transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
              >
                <svg className="h-5 w-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {notificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold leading-none text-white shadow-lg">
                    {notificationCount}
                  </span>
                ) : null}
              </button>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto space-y-5 pr-1">{children}</main>
        </div>
      </div>

      {isNotificationOpen ? (
        <>
          <button
            type="button"
            aria-label="Close notifications overlay"
            onClick={closeNotifications}
            className="fixed inset-0 z-40 cursor-default bg-slate-950/30 backdrop-blur-md"
          />
          <RightNotificationPanel />
        </>
      ) : null}
    </div>
  );
}
