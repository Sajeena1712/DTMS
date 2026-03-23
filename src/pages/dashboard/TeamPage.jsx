import { useEffect, useMemo, useState } from "react";
import { fetchUsers } from "../../api/userApi";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../contexts/TaskContext";

export default function TeamPage() {
  const { user } = useAuth();
  const { tasks } = useTasks();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    async function loadUsers() {
      try {
        const { users: userList } = await fetchUsers();
        setUsers(userList ?? []);
      } catch {
        setUsers([]);
      }
    }

    loadUsers();
  }, []);

  const collaborators = useMemo(() => {
    if (user?.role === "admin") {
      return users;
    }

    const names = new Map();
    tasks.forEach((task) => {
      if (task.createdBy?.id) {
        names.set(task.createdBy.id, task.createdBy);
      }
    });
    return Array.from(names.values());
  }, [tasks, user?.role, users]);

  return (
    <div className="space-y-5">
      <section className="task-panel p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Team</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-slate-950">
          {user?.role === "admin" ? "Team management" : "Team collaboration"}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          {user?.role === "admin"
            ? "Review team members, assignment coverage, and collaboration visibility."
            : "See the people connected to your active tasks and delivery workflow."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {collaborators.map((member) => (
          <article key={member.id} className="task-panel p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-semibold text-blue-600">
                {(member.name || member.email || "U").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-base font-semibold text-slate-950">{member.name || "Team member"}</p>
                <p className="text-sm text-slate-500">{member.email}</p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
