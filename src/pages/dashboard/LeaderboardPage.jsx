import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { resolveApiUrl } from "../../api/client";
import { fetchLeaderboard } from "../../api/userApi";
import { useAuth } from "../../contexts/AuthContext";
import { cn, formatPercent } from "../../lib/utils";

function initials(name = "") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function Avatar({ user }) {
  const avatar = resolveApiUrl(user?.avatar);
  const label = initials(user?.name || user?.email);

  if (avatar) {
    return (
      <div className="h-14 w-14 overflow-hidden rounded-[20px] border border-white/70 bg-slate-100 shadow-sm">
        <img src={avatar} alt={user?.name || "User avatar"} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] text-sm font-semibold text-blue-700 shadow-sm">
      {label || "U"}
    </div>
  );
}

function StatCard({ label, value, detail, tone = "blue" }) {
  const toneMap =
    tone === "violet"
      ? "from-violet-500/15 via-fuchsia-500/8 to-white"
      : tone === "emerald"
        ? "from-emerald-500/15 via-teal-500/8 to-white"
        : "from-blue-500/15 via-cyan-500/8 to-white";

  return (
    <div className={cn("rounded-[26px] border border-slate-200/80 bg-gradient-to-br p-5 shadow-[0_18px_50px_rgba(148,163,184,0.10)]", toneMap)}>
      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
      <p className="mt-4 font-display text-4xl font-semibold text-slate-950">{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{detail}</p>
    </div>
  );
}

function RankCard({ user, highlight = false }) {
  return (
    <div
      className={cn(
        "rounded-[28px] border p-5 shadow-[0_20px_60px_rgba(148,163,184,0.12)] backdrop-blur-xl transition hover:-translate-y-0.5",
        highlight
          ? "border-blue-200 bg-[linear-gradient(145deg,#eff6ff_0%,#ffffff_65%,#ffffff_100%)]"
          : "border-slate-200/80 bg-white/90",
      )}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold",
            user.rank === 1
              ? "bg-amber-100 text-amber-700"
              : user.rank === 2
                ? "bg-slate-100 text-slate-700"
                : user.rank === 3
                  ? "bg-orange-100 text-orange-700"
                  : "bg-blue-50 text-blue-700",
          )}
        >
          #{user.rank}
        </div>

        <Avatar user={user} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-slate-950">{user.name}</p>
            {highlight ? (
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                You
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-500">{user.completedTasks} completed tasks</p>
        </div>

        <div className="w-full sm:w-[220px]">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
            <span>Progress</span>
            <span>{formatPercent(user.progress || 0)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#06b6d4_100%)]",
                user.rank === 1 ? "shadow-[0_0_24px_rgba(37,99,235,0.45)]" : "",
              )}
              style={{ width: `${Math.max(6, user.progress || 0)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, averageCompleted: 0, topCompleted: 0, currentUser: null });
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      try {
        setLoading(true);
        const data = await fetchLeaderboard(period);
        if (!active) return;
        setLeaderboard(data.leaderboard || []);
        setTeamLeaderboard(data.teamLeaderboard || []);
        setStats(data.stats || { totalUsers: 0, averageCompleted: 0, topCompleted: 0, currentUser: null });
      } catch (error) {
        console.error("Failed to load leaderboard", error);
        if (active) {
          setLeaderboard([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLeaderboard();

    return () => {
      active = false;
    };
  }, [period]);

  const podium = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const currentUserEntry = stats.currentUser || leaderboard.find((entry) => entry.id === user?.id) || null;

  if (loading) {
    return (
      <section className="task-panel flex min-h-[40vh] items-center justify-center p-10">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 shadow-lg" />
          <p className="mt-4 text-slate-500">Loading leaderboard...</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="task-panel overflow-hidden p-6 sm:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Leaderboard</p>
            <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Top performers</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Celebrate the people who complete the most tasks. Rankings update from completed work and show progress against the team leader.
            </p>
          </div>
          {currentUserEntry ? (
            <div className="rounded-[28px] border border-blue-100 bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Your rank</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">#{currentUserEntry.rank}</p>
              <p className="mt-1 text-sm text-slate-600">{currentUserEntry.completedTasks} completed tasks</p>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { label: "All time", value: "all" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={cn(
                "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition",
                period === option.value
                  ? "bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)] text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)]"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total users" value={stats.totalUsers} detail="Active contributors shown in the ranking." tone="blue" />
        <StatCard label="Average completions" value={stats.averageCompleted} detail="Average completed tasks across the leaderboard." tone="emerald" />
        <StatCard label="Top score" value={stats.topCompleted} detail="Completed-task count held by the current leader." tone="violet" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[30px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Podium</p>
          <h2 className="mt-3 font-display text-2xl font-semibold text-slate-950">Top three creators</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {podium.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  "rounded-[26px] border p-4 text-center shadow-[0_18px_45px_rgba(148,163,184,0.12)]",
                  index === 0
                    ? "order-first border-amber-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_65%)]"
                    : index === 1
                      ? "border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_70%)]"
                      : "border-orange-200 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_70%)]",
                )}
              >
                <div
                  className={cn(
                    "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold",
                    index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-100 text-slate-700" : "bg-orange-100 text-orange-700",
                  )}
                >
                  #{entry.rank}
                </div>
                <div className="mx-auto mt-4">
                  <Avatar user={entry} />
                </div>
                <p className="mt-4 truncate text-base font-semibold text-slate-950">{entry.name}</p>
                <p className="mt-2 text-sm text-slate-500">{entry.completedTasks} completed</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#06b6d4_100%)]" style={{ width: `${Math.max(10, entry.progress || 0)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[30px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Rankings</p>
              <h2 className="mt-3 font-display text-2xl font-semibold text-slate-950">Full leaderboard</h2>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Team leader</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{leaderboard[0]?.name || "No data"}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {leaderboard.length ? (
              leaderboard.map((entry) => (
                <RankCard key={entry.id} user={entry} highlight={entry.id === user?.id} />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                <p className="text-sm font-semibold text-slate-950">No leaderboard data yet</p>
                <p className="mt-2 text-sm text-slate-500">Once users complete tasks, the ranking will appear here automatically.</p>
              </div>
            )}
          </div>
        </motion.div>
      </section>

      <section className="rounded-[30px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
        <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Team performance</p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-slate-950">Teams by completed work</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teamLeaderboard.length ? teamLeaderboard.map((team) => (
            <div key={team.id} className="rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-950">{team.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{team.memberCount} members</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {team.completedTasks} done
                </span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#06b6d4_100%)]" style={{ width: `${Math.max(8, team.completionRate || 0)}%` }} />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                <span>Active members: {team.activeMembers}</span>
                <span>{team.totalTasks} tasks</span>
              </div>
            </div>
          )) : (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500">
              No team performance data yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
