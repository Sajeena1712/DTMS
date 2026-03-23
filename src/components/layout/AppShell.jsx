import { NavLink } from "react-router-dom";
import { adminNavLinks, userNavLinks } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";

const navIcons = {
  Dashboard: "D",
  Tasks: "T",
  Calendar: "C",
  Analytics: "A",
  Team: "TM",
  Settings: "S",
};

export default function AppShell({ children, variant }) {
  const { user, logout } = useAuth();
  const visibleLinks = variant === "admin" ? adminNavLinks : userNavLinks;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-4 md:px-6 lg:px-8">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/workspace-bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(239,246,255,0.88)_0%,rgba(248,251,255,0.86)_40%,rgba(255,255,255,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_30%)]" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1500px] gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="flex flex-col justify-between rounded-[32px] border border-blue-100 bg-white p-6 shadow-[0_20px_60px_rgba(59,130,246,0.10)]">
          <div>
            <div className="rounded-[28px] bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="DTMS logo" className="h-12 w-12 rounded-2xl object-cover shadow-md" />
                <div>
                  <p className="text-xs font-semibold tracking-[0.34em] text-blue-500">DTMS</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">Digital Talent</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {variant === "admin"
                  ? "Control operations, analytics, team performance, and task delivery from one premium workspace."
                  : "Track personal work, deadlines, calendar activity, and performance in one clean dashboard."}
              </p>
            </div>

            <nav className="mt-8 space-y-2">
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300",
                      isActive
                        ? "bg-[linear-gradient(135deg,#2563eb_0%,#3b82f6_55%,#60a5fa_100%)] text-white shadow-[0_16px_40px_rgba(59,130,246,0.24)]"
                        : "text-slate-600 hover:bg-blue-50 hover:text-slate-950",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl text-[11px]", isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")}>
                        {navIcons[link.label] ?? "•"}
                      </span>
                      <span>{link.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="rounded-[24px] border border-blue-100 bg-blue-50/70 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Workspace</p>
            <p className="mt-3 text-lg font-semibold text-slate-950">{user?.name}</p>
            <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
            <button
              type="button"
              onClick={logout}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(59,130,246,0.18)] transition hover:-translate-y-0.5"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="space-y-5">
          <header className="flex flex-col gap-4 rounded-[32px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(59,130,246,0.08)] lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Workspace overview</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-slate-950">
                {variant === "admin" ? "DTMS Admin Center" : "DTMS Personal Workspace"}
              </h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks, team, or analytics"
                  className="h-12 w-full rounded-2xl border border-blue-100 bg-slate-50 px-4 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white sm:w-80"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-blue-500">Go</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-600">
                  3
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-slate-50 px-4 py-2.5">
                  <img src="/logo.png" alt="DTMS profile" className="h-9 w-9 rounded-xl object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{user?.name}</p>
                    <p className="text-xs text-slate-500">{variant === "admin" ? "Administrator" : "Contributor"}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="space-y-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
