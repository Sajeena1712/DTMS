import { useAuth } from "../../contexts/AuthContext";
import { assetPath } from "../../lib/assetPaths";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <section className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Settings</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Workspace preferences</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Review your workspace identity, role access, and product preferences inside a clean DTMS settings surface.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Account</p>
          <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(79,70,229,0.08),rgba(6,182,212,0.06),rgba(255,255,255,0.92))] p-5">
            <div className="flex items-center gap-4">
                <img src={assetPath("logo.png")} alt="DTMS logo" className="h-14 w-14 rounded-2xl object-cover shadow-md" />
              <div>
                <p className="text-lg font-semibold text-slate-950">{user?.name}</p>
                <p className="text-sm text-slate-600">{user?.email}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Role</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{user?.role}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Workspace</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">Digital Talent Management System</p>
              </div>
            </div>
          </div>
        </article>

        <article className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Preferences</p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5">
              <p className="text-sm font-semibold text-slate-950">Task notifications</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Stay informed about assignment updates, deadline changes, and submission reviews.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5">
              <p className="text-sm font-semibold text-slate-950">Workspace visibility</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep your dashboards aligned with current task status, chart insights, and team activity.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5">
              <p className="text-sm font-semibold text-slate-950">Design system</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Premium glassmorphism surfaces, pastel accents, and rounded product cards are active for this workspace.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
