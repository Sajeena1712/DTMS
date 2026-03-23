import { useEffect, useState } from "react";
import { fetchUsers } from "../../api/userApi";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);
        const { users: userList } = await fetchUsers();
        if (active) {
          setUsers(userList ?? []);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
          setUsers([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="task-panel p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Users</p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Team directory</h1>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="task-panel h-48 animate-pulse p-6">
              <div className="mb-4 h-5 w-48 rounded-md bg-slate-200"></div>
              <div className="mb-3 h-4 w-32 rounded-md bg-slate-200"></div>
              <div className="h-10 w-24 rounded-full bg-slate-200"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Users</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Team directory</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Review verified contributors, monitor onboarding status, and keep assignment capacity visible.
        </p>
      </section>

      {error ? (
        <section className="task-panel p-8 text-center">
          <p className="mb-4 text-slate-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-secondary"
          >
            Retry
          </button>
        </section>
      ) : users.length === 0 ? (
        <section className="task-panel p-8 text-center">
          <p className="mb-2 text-2xl font-semibold text-slate-950">No users yet</p>
          <p className="mb-6 text-slate-600">Team members will appear here once they register and verify.</p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <article key={user.id} className="task-panel p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    user.isVerified
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-amber-500/15 text-amber-700"
                  }`}
                >
                  {user.isVerified ? "Verified" : "Pending"}
                </span>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 text-sm text-slate-600">
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
