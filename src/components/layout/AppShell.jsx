import { NavLink } from "react-router-dom";
import { adminNavLinks, userNavLinks } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { assetPath } from "../../lib/assetPaths";

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
    <div className="relative h-screen overflow-hidden bg-slate-950 px-4 py-4 md:px-6 lg:px-8">
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
        <source src="/workspace-bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(239,246,255,0.88)_0%,rgba(248,251,255,0.86)_40%,rgba(255,255,255,0.92)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_30%)]" />

      <div className="relative z-10 mx-auto grid h-full max-w-[1500px] gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[32px] border border-blue-100 bg-white p-6 shadow-[0_20px_60px_rgba(59,130,246,0.10)]">
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="rounded-[28px] bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
              <div className="flex items-center justify-center">
                <img
                  src={assetPath("logo.png")}
                  alt="DTMS logo"
                  className="h-24 w-24 rounded-[28px] object-cover shadow-[0_18px_40px_rgba(59,130,246,0.18)]"
                />
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
                    <>
                      <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl text-[11px]", isActive ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600")}>
                        {navIcons[link.label] ?? "*"}
                      </span>
                      <span>{link.label}</span>
                    </>
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
          <header className="flex items-center justify-center rounded-[32px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(59,130,246,0.08)]">
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
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto space-y-5 pr-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
