import { useMemo } from "react";
import { useTasks } from "../../contexts/TaskContext";

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const { tasks } = useTasks();
  const today = useMemo(() => new Date(), []);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startWeekday = monthStart.getDay();

  const monthCells = Array.from({ length: monthEnd.getDate() }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), index + 1);
    return {
      date,
      dayNumber: index + 1,
      tasksForDay: tasks.filter((task) => task.deadline && sameDay(new Date(task.deadline), date)),
    };
  });

  return (
    <div className="space-y-5">
      <section className="task-panel p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Calendar</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-slate-950">Deadline calendar</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Review task deadlines, team schedules, and important work dates from a clean monthly view.
        </p>
      </section>

      <section className="task-panel p-6">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
            <div key={label} className="py-2">{label}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: startWeekday }).map((_, index) => (
            <div key={`blank-${index}`} className="min-h-[92px] rounded-2xl bg-slate-50/70" />
          ))}

          {monthCells.map((cell) => (
            <div key={cell.dayNumber} className="min-h-[92px] rounded-2xl border border-blue-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">{cell.dayNumber}</span>
                {cell.tasksForDay.length ? <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> : null}
              </div>
              <div className="mt-3 space-y-1">
                {cell.tasksForDay.slice(0, 2).map((task) => (
                  <p key={task.id} className="truncate text-[11px] font-medium text-slate-600">{task.title}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
