import { useEffect, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { fetchTasks, fetchDashboardStats } from '../../api/taskApi';
import { fetchAdminSummary } from '../../api/adminApi';
import { cn } from '../../lib/utils';

const COLORS = ['#4F46E5', '#8B5CF6', '#06B6D4', '#10B981', '#F97316'];

export default function AnalyticsPage() {
  const [data, setData] = useState({ tasks: [], stats: {} });
  const [summary, setSummary] = useState({ stats: {}, teamPerformance: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tasksRes, statsRes] = await Promise.all([
          fetchTasks(),
          fetchDashboardStats()
        ]);
        setData({ tasks: tasksRes.tasks || [], stats: statsRes.stats || {} });
        const adminSummary = await fetchAdminSummary();
        setSummary(adminSummary);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statusData = data.tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(statusData).map(([name, value]) => ({ name, value }));

  const activityData = [
    { name: 'Mon', tasks: 3 },
    { name: 'Tue', tasks: 5 },
    { name: 'Wed', tasks: 2 },
    { name: 'Thu', tasks: 8 },
    { name: 'Fri', tasks: 4 },
  ];

  if (loading) {
    return (
      <section className="task-panel p-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-2xl bg-gradient-to-r from-indigo-400 to-cyan-400 shadow-lg" />
          <p className="mt-4 text-slate-500">Loading analytics...</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="task-panel"
      >
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Analytics overview</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Performance metrics</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          Track hiring velocity, task completion rates, and workflow efficiency with interactive charts.
        </p>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="task-panel p-6">
          <h2 className="text-2xl font-semibold text-slate-950 mb-6">Tasks by status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f8fafc" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} />
              <YAxis axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="task-panel p-6">
          <h2 className="text-2xl font-semibold text-slate-950 mb-6">Status distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.section>
      </div>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="task-panel p-6">
        <h2 className="text-2xl font-semibold text-slate-950 mb-6">Weekly activity</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={activityData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f8fafc" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="tasks" stroke="#4F46E5" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-3">
        <div className="task-panel p-6 text-center">
          <p className="text-4xl font-semibold text-slate-950">{data.stats.totalTasks || 0}</p>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-wide">Total tasks</p>
        </div>
        <div className="task-panel p-6 text-center">
          <p className="text-4xl font-semibold text-emerald-600">{data.stats.completedTasks || 0}</p>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-wide">Completed</p>
        </div>
        <div className="task-panel p-6 text-center">
          <p className="text-4xl font-semibold text-amber-600">{data.stats.pendingTasks || 0}</p>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-wide">Pending review</p>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 md:grid-cols-4">
        <div className="task-panel p-6 text-center">
          <p className="text-4xl font-semibold text-slate-950">{summary.stats?.totalTeams || 0}</p>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-wide">Total teams</p>
        </div>
        <div className="task-panel p-6 text-center">
          <p className="text-4xl font-semibold text-sky-600">{summary.stats?.totalUsers || 0}</p>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-wide">Total users</p>
        </div>
        <div className="task-panel p-6 text-center">
          <p className="text-4xl font-semibold text-emerald-600">{summary.stats?.tasksCompleted || 0}</p>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-wide">Tasks completed</p>
        </div>
        <div className="task-panel p-6 text-center">
          <p className="text-4xl font-semibold text-rose-600">{summary.stats?.tasksPending || 0}</p>
          <p className="mt-2 text-sm text-slate-500 uppercase tracking-wide">Tasks pending</p>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="task-panel p-6">
        <h2 className="text-2xl font-semibold text-slate-950 mb-6">Team performance</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(summary.teamPerformance || []).map((team) => (
            <div key={team.id} className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <p className="text-lg font-semibold text-slate-950">{team.name}</p>
              <p className="mt-1 text-sm text-slate-500">{team.memberCount} members</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(8, team.completedTasks || 0 ? Math.min(100, Math.round((team.completedTasks / Math.max(1, team.totalTasks)) * 100)) : 0)}%` }} />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {team.completedTasks} completed / {team.totalTasks} assigned
              </p>
            </div>
          ))}
          {!summary.teamPerformance?.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No team performance data yet.
            </div>
          ) : null}
        </div>
      </motion.section>
    </div>
  );
}

