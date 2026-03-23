import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MetricCard from "../../components/dashboard/MetricCard";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";
import { displayTaskStatus, normalizeTaskStatus } from "../../lib/constants";

const PIE_COLORS = ["#2563eb", "#60a5fa", "#93c5fd", "#bfdbfe"];

function formatTimeline(tasks) {
  const buckets = new Map();
  tasks.forEach((task) => {
    const date = new Date(task.createdAt || task.deadline || Date.now());
    const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .map(([label, total]) => ({ label, total }))
    .slice(-7);
}

function getDueSoonTasks(tasks) {
  const now = new Date();
  return tasks
    .filter((task) => task.deadline && normalizeTaskStatus(task.status) !== "COMPLETED")
    .map((task) => {
      const diff = Math.ceil((new Date(task.deadline).setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0)) / (24 * 60 * 60 * 1000));
      return { ...task, remainingDays: diff };
    })
    .filter((task) => task.remainingDays >= 0)
    .sort((a, b) => a.remainingDays - b.remainingDays)
    .slice(0, 4);
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { tasks } = useTasks();

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => normalizeTaskStatus(task.status) === "COMPLETED").length;
    const ongoingTasks = tasks.filter((task) => normalizeTaskStatus(task.status) === "IN_PROGRESS").length;
    const pendingTasks = tasks.filter((task) =>
      ["PENDING", "PENDING_REVIEW", "REJECTED"].includes(normalizeTaskStatus(task.status)),
    ).length;
    return { totalTasks, completedTasks, ongoingTasks, pendingTasks };
  }, [tasks]);

  const barData = useMemo(() => formatTimeline(tasks), [tasks]);
  const donutData = useMemo(() => {
    const grouped = tasks.reduce((acc, task) => {
      const label = displayTaskStatus(task.status);
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const completionRate = stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const upcomingTasks = useMemo(() => getDueSoonTasks(tasks), [tasks]);
  const teamList = useMemo(() => {
    const grouped = new Map();
    tasks.forEach((task) => {
      const key = task.assignedUserName || task.assignedUser || "Unassigned";
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([name, total]) => ({ name, total }))
      .slice(0, 5);
  }, [tasks]);

  return (
    <div className="space-y-5">
      <section className="task-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Admin dashboard</p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-slate-950">Welcome back, {user?.name}</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              Oversee task assignment, team coordination, and full analytics from a cleaner DTMS SaaS workspace.
            </p>
          </div>
          <div className="rounded-[28px] bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] px-6 py-5">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Admin control</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">Full analytics and user management active</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Tasks" value={stats.totalTasks} detail="All assignments across DTMS." accent="violet" />
        <MetricCard label="Completed" value={stats.completedTasks} detail="Delivered and approved tasks." accent="green" />
        <MetricCard label="Ongoing" value={stats.ongoingTasks} detail="Work currently in progress." accent="cyan" />
        <MetricCard label="Pending" value={stats.pendingTasks} detail="Waiting for action or review." accent="rose" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <article className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Task analytics</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Task activity over time</h2>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData.length ? barData : [{ label: "No data", total: 0 }]}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} stroke="#64748b" />
                <YAxis axisLine={false} tickLine={false} stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="total" radius={[14, 14, 4, 4]} fill="url(#adminBarGradient)" />
                <defs>
                  <linearGradient id="adminBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Distribution</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Task split</h2>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" innerRadius={75} outerRadius={110} paddingAngle={4}>
                  {donutData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="task-panel p-6">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Completion</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Overall progress</h2>
              <div className="mt-6 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="65%"
                    outerRadius="100%"
                    startAngle={180}
                    endAngle={0}
                    data={[{ name: "Completion", value: completionRate, fill: "#2563eb" }]}
                  >
                    <RadialBar background dataKey="value" cornerRadius={18} />
                    <Tooltip />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center text-3xl font-semibold text-slate-950">{completionRate}%</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Reminders</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Upcoming deadlines</h2>
              <div className="mt-5 grid gap-3">
                {upcomingTasks.length ? upcomingTasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                    <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Due in {task.remainingDays} day{task.remainingDays === 1 ? "" : "s"}
                    </p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-slate-600">
                    No urgent reminders right now.
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="grid gap-4">
          <div className="task-panel p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Team collaboration</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Team load</h2>
            <div className="mt-5 grid gap-3">
              {teamList.map((member) => (
                <div key={member.name} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-600">
                      {member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{member.name}</span>
                  </div>
                  <span className="text-sm text-slate-500">{member.total} tasks</span>
                </div>
              ))}
            </div>
          </div>

          <div className="task-panel p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Time tracker</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Workload tracking</h2>
            <div className="mt-5 rounded-[24px] bg-[linear-gradient(145deg,#dbeafe_0%,#eff6ff_55%,#ffffff_100%)] p-5">
              <p className="text-sm text-slate-600">Focus hours this week</p>
              <p className="mt-2 text-4xl font-semibold text-slate-950">{Math.max(tasks.length * 3, 12)}h</p>
              <div className="mt-4 h-3 rounded-full bg-white">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)]" style={{ width: `${Math.min(100, 35 + tasks.length * 6)}%` }} />
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
