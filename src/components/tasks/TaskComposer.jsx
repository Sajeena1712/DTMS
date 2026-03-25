import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchUsers } from "../../api/userApi";
import { statusTone, taskStatuses, taskVisuals } from "../../lib/constants";
import { parseEmailList } from "./taskAssignment";

const defaultForm = {
  title: "",
  description: "",
  assignedUserId: "",
  assignmentMode: "single",
  assigneeEmails: "",
  status: "PENDING",
  deadline: "",
  image: taskVisuals[0],
};

export default function TaskComposer({
  mode = "create",
  initialValues,
  onSubmit,
  onCancel,
  savingLabel = "Saving...",
  idleLabel = "Create task",
}) {
  const [form, setForm] = useState(defaultForm);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(
      initialValues
        ? {
            ...defaultForm,
            title: initialValues.title ?? "",
            description: initialValues.description ?? "",
            assignedUserId:
              initialValues.assignedUserId ??
              initialValues.assignedTo ??
              initialValues.assignedUser?.id ??
              "",
            assignmentMode: "single",
            assigneeEmails: "",
            status: initialValues.status ?? "Pending",
            deadline: initialValues.deadline
              ? new Date(initialValues.deadline).toISOString().slice(0, 10)
              : "",
            image: initialValues.image ?? defaultForm.image,
          }
        : defaultForm,
    );
  }, [initialValues]);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const { users: userList } = await fetchUsers();
        if (active) {
          setUsers(userList ?? []);
        }
      } catch {
        if (active) {
          setUsers([]);
        }
      } finally {
        if (active) {
          setLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      active = false;
    };
  }, []);

  const selectedUser = useMemo(() => users.find((user) => user.id === form.assignedUserId), [form.assignedUserId, users]);
  const parsedEmails = useMemo(() => parseEmailList(form.assigneeEmails), [form.assigneeEmails]);

  const assignmentSummary = useMemo(() => {
    if (form.assignmentMode === "all") {
      return `${users.length} registered users`;
    }

    if (form.assignmentMode === "emails") {
      return `${parsedEmails.length} email${parsedEmails.length === 1 ? "" : "s"}`;
    }

    return selectedUser?.name || "No teammate selected yet";
  }, [form.assignmentMode, parsedEmails.length, selectedUser?.name, users.length]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        deadline: form.deadline || undefined,
        image: form.image,
      };

      if (form.assignmentMode === "emails") {
        payload.assignedEmails = parsedEmails;
      } else if (form.assignmentMode === "all") {
        payload.assignToAllUsers = true;
      } else {
        payload.assignedUserId = form.assignedUserId;
      }

      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
    >
      <form onSubmit={handleSubmit} className="task-panel p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">
              {mode === "edit" ? "Edit Task" : "Create Task"}
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-slate-950">
              {mode === "edit" ? "Refine delivery details" : "Spin up a new workstream"}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Keep requirements, owner, deadline, and execution state aligned before the task reaches the team.
            </p>
          </div>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          ) : null}
        </div>

        <div className="mt-8 grid gap-5">
          <label className="relative block">
            <input
              name="title"
              value={form.title}
              onChange={updateField}
              placeholder="Task title"
              className="task-field peer"
              required
            />
            <span className="task-floating-label">Task title</span>
          </label>

          <label className="relative block">
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="Description"
              className="task-textarea peer"
              required
            />
            <span className="task-floating-label">Description</span>
          </label>

          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Assignment mode</span>
            <select name="assignmentMode" value={form.assignmentMode} onChange={updateField} className="task-select">
              <option value="single">Single user</option>
              <option value="emails">Multiple registered emails</option>
              <option value="all">All registered users</option>
            </select>
          </div>

          {form.assignmentMode === "single" ? (
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Assignee</span>
                <select
                  name="assignedUserId"
                  value={form.assignedUserId}
                  onChange={updateField}
                  className="task-select"
                  required
                >
                  <option value="">{loadingUsers ? "Loading users..." : "Choose a teammate"}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Deadline</span>
                <input type="date" name="deadline" value={form.deadline} onChange={updateField} className="task-select" />
              </label>
            </div>
          ) : form.assignmentMode === "emails" ? (
            <>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Registered emails
                </span>
                <textarea
                  name="assigneeEmails"
                  value={form.assigneeEmails}
                  onChange={updateField}
                  placeholder="Paste email addresses separated by commas, spaces, or new lines"
                  className="task-textarea peer min-h-[130px]"
                  required
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Deadline</span>
                <input type="date" name="deadline" value={form.deadline} onChange={updateField} className="task-select" />
              </label>
            </>
          ) : (
            <>
              <div className="rounded-3xl border border-cyan-200/60 bg-cyan-50/70 p-5 text-sm text-slate-700">
                This will create one task for every registered student account.
              </div>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Deadline</span>
                <input type="date" name="deadline" value={form.deadline} onChange={updateField} className="task-select" />
              </label>
            </>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Status</span>
              <select name="status" value={form.status} onChange={updateField} className="task-select">
                {taskStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Preview image</span>
              <select name="image" value={form.image} onChange={updateField} className="task-select">
                {taskVisuals.map((value, index) => (
                  <option key={value} value={value}>
                    Professional image {index + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200/80 bg-[linear-gradient(145deg,rgba(79,70,229,0.05),rgba(6,182,212,0.04),rgba(255,255,255,0.92))] p-5 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Priority vibe</p>
              <p className="mt-2 text-sm text-slate-700">
                {form.status === "COMPLETED"
                  ? "Ready for archive and stakeholder review."
                  : form.status === "IN_PROGRESS"
                    ? "Live execution with active delivery ownership."
                    : "Queued for kickoff and assignment."}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Assignee</p>
              <p className="mt-2 text-sm text-slate-700">{assignmentSummary}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Deadline</p>
              <p className="mt-2 text-sm text-slate-700">{form.deadline || "Flexible timeline"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? savingLabel : idleLabel}
            </button>
            <button type="button" onClick={onCancel} className="btn-secondary">
              Back
            </button>
          </div>
        </div>
      </form>

      <motion.section
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, delay: 0.06, ease: "easeOut" }}
        className="task-panel overflow-hidden"
      >
        <div className="relative h-[280px] overflow-hidden border-b border-slate-200/80">
          <img
            src={form.image}
            alt={form.title || "Task preview"}
            className="h-full w-full object-cover transition duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),rgba(15,23,42,0.70))]" />
          <div className="absolute left-5 top-5 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[form.status]}`}>{form.status}</span>
            <span className="rounded-full border border-cyan-200 bg-white/20 px-3 py-1 text-xs font-semibold text-white">
              Live preview
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-xs uppercase tracking-[0.32em] text-white/55">Workstream card</p>
            <h3 className="mt-3 font-display text-3xl font-semibold text-white">
              {form.title || "Task title preview"}
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">
              {form.description || "Your task summary will appear here with a premium editorial card layout."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Assigned to</p>
              <p className="mt-2 text-sm font-medium text-slate-950">{assignmentSummary}</p>
              <p className="mt-1 text-sm text-slate-600">
                {form.assignmentMode === "emails"
                  ? `${parsedEmails.length} registered email${parsedEmails.length === 1 ? "" : "s"}`
                  : form.assignmentMode === "all"
                    ? "One task record will be created for each registered student."
                    : selectedUser?.email || "No assignee selected"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Deadline</p>
              <p className="mt-2 text-sm font-medium text-slate-950">{form.deadline || "Not scheduled"}</p>
              <p className="mt-1 text-sm text-slate-600">Keep timelines visible to the delivery team.</p>
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-200/70 bg-[linear-gradient(135deg,rgba(99,102,241,0.10),rgba(34,211,238,0.08),rgba(255,255,255,0.88))] p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Publishing notes</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <li>Clear briefs create faster execution and fewer review cycles.</li>
              <li>Assign ownership before launch so task accountability is visible instantly.</li>
              <li>Status and deadlines flow directly into the dashboard and task board views.</li>
            </ul>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
