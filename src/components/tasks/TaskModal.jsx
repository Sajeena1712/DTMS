import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { safeRequest } from "../../api/client";
import { fetchTeams } from "../../api/adminApi";
import { displayTaskStatus, normalizeTaskStatus, statusTone, taskStatuses, taskVisuals } from "../../lib/constants";
import { parseEmailList } from "./taskAssignment";

const defaultForm = {
  title: "",
  description: "",
  assignedUserId: "",
  assignedTeamId: "",
  assignmentMode: "single",
  assigneeEmails: "",
  status: "PENDING",
  deadline: "",
  lateSubmissionReason: "",
  reviewDecision: "",
  reviewFeedback: "",
  image: taskVisuals[0],
};

export default function TaskModal({ open, onClose, onSubmit, initialValues, mode = "create" }) {
  const [form, setForm] = useState(defaultForm);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const selectedUser = users.find((user) => user.id === form.assignedUserId);
  const selectedUserTeamName = selectedUser?.teamName || selectedUser?.team?.name || "No team assigned";
  const selectedTeam = teams.find((team) => team.id === form.assignedTeamId);

  useEffect(() => {
    if (initialValues) {
      setForm({
        ...defaultForm,
        title: initialValues.title ?? "",
        description: initialValues.description ?? "",
        assignedUserId:
          initialValues.assignedUserId ??
          initialValues.assignedTo ??
          initialValues.assignedUser?.id ??
          "",
        assignedTeamId: initialValues.teamId ?? initialValues.assignedTeamId ?? "",
        assignmentMode: "single",
        assigneeEmails: "",
        status: normalizeTaskStatus(initialValues.status ?? "PENDING"),
        deadline: initialValues.deadline
          ? new Date(initialValues.deadline).toISOString().slice(0, 10)
          : "",
        lateSubmissionReason: initialValues.reminders?.lateSubmissionReason ?? initialValues.lateSubmissionReason ?? "",
        reviewDecision: initialValues.review?.decision ?? "",
        reviewFeedback: initialValues.review?.feedback ?? "",
        image: initialValues.image ?? defaultForm.image,
      });
    } else {
      setForm(defaultForm);
    }
  }, [initialValues, open]);

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoadingUsers(true);
      try {
        const { users: userList } = await safeRequest(() => api.get("/user"), "Unable to load users");
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

    if (open) {
      loadUsers();
    }

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    let active = true;

    async function loadTeams() {
      setLoadingTeams(true);
      try {
        const { teams: teamList } = await fetchTeams();
        if (active) {
          setTeams(teamList ?? []);
        }
      } catch {
        if (active) {
          setTeams([]);
        }
      } finally {
        if (active) {
          setLoadingTeams(false);
        }
      }
    }

    if (open) {
      loadTeams();
    }

    return () => {
      active = false;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const parsedEmails = parseEmailList(form.assigneeEmails);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, image: String(reader.result) }));
    };
    reader.readAsDataURL(file);
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
        lateSubmissionReason: form.lateSubmissionReason.trim() || undefined,
        image: form.image,
      };

      if (mode === "create") {
        if (form.assignmentMode === "emails") {
          payload.assignedEmails = parsedEmails;
        } else if (form.assignmentMode === "team") {
          payload.assignedTeamId = form.assignedTeamId;
        } else if (form.assignmentMode === "all") {
          payload.assignToAllUsers = true;
        } else {
          payload.assignedUserId = form.assignedUserId;
        }
      } else {
        payload.assignedUserId = form.assignedUserId;
        if (form.reviewDecision === "Approved" || form.reviewDecision === "Rejected") {
          payload.reviewDecision = form.reviewDecision;
          payload.reviewFeedback = form.reviewFeedback.trim();
        }
      }

      await onSubmit(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#020617]/70 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(2,6,23,0.94))] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.55)] backdrop-blur-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Task Form</p>
            <h3 className="mt-3 font-display text-3xl font-semibold text-white">
              {mode === "edit" ? "Edit task" : "Create a new task"}
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Capture the task scope, ownership, due date, and status inside a premium glass form panel.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-white/65">Task basics</p>
            <div className="mt-4 grid gap-4">
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="Task title"
                className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                required
              />

              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Add a short task brief or delivery summary."
                className="min-h-24 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45 transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                required
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-white/65">Assignment</p>
            {mode === "create" ? (
              <>
                <label className="mt-4 grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Assignment mode</span>
                  <select
                    name="assignmentMode"
                    value={form.assignmentMode}
                    onChange={updateField}
                    className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                  >
                    <option value="single" className="text-slate-900">Single user</option>
                    <option value="team" className="text-slate-900">Whole team</option>
                    <option value="emails" className="text-slate-900">Multiple registered emails</option>
                    <option value="all" className="text-slate-900">All registered users</option>
                  </select>
                </label>

                {form.assignmentMode === "single" ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Assign user</span>
                      <select
                        name="assignedUserId"
                        value={form.assignedUserId}
                        onChange={updateField}
                        className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                        required
                      >
                        <option value="" className="text-slate-900">
                          {loadingUsers ? "Loading users..." : "Select user"}
                        </option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id} className="text-slate-900">
                            {user.name || user.email}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Deadline</span>
                      <input
                        name="deadline"
                        type="date"
                        value={form.deadline}
                        onChange={updateField}
                        className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                      />
                    </label>
                  </div>
                ) : form.assignmentMode === "team" ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Team</span>
                      <select
                        name="assignedTeamId"
                        value={form.assignedTeamId}
                        onChange={updateField}
                        className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                        required
                      >
                        <option value="" className="text-slate-900">
                          {loadingTeams ? "Loading teams..." : "Select team"}
                        </option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id} className="text-slate-900">
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Deadline</span>
                      <input
                        name="deadline"
                        type="date"
                        value={form.deadline}
                        onChange={updateField}
                        className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                      />
                    </label>
                  </div>
                ) : form.assignmentMode === "emails" ? (
                  <>
                    <label className="mt-4 grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                        Registered emails
                      </span>
                      <textarea
                        name="assigneeEmails"
                        value={form.assigneeEmails}
                        onChange={updateField}
                        placeholder="Paste email addresses separated by commas, spaces, or new lines"
                        className="min-h-24 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45 transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                        required
                      />
                    </label>

                    <label className="mt-4 grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Deadline</span>
                      <input
                        name="deadline"
                        type="date"
                        value={form.deadline}
                        onChange={updateField}
                        className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <div className="mt-4 rounded-2xl border border-cyan-200/30 bg-cyan-400/10 p-4 text-sm text-white/80">
                      This will create one task record for each registered student.
                    </div>
                    <label className="mt-4 grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Deadline</span>
                      <input
                        name="deadline"
                        type="date"
                        value={form.deadline}
                        onChange={updateField}
                        className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                      />
                    </label>
                  </>
                )}
              </>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Assign user</span>
                  <select
                    name="assignedUserId"
                    value={form.assignedUserId}
                    onChange={updateField}
                    className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                    required
                  >
                    <option value="" className="text-slate-900">
                      {loadingUsers ? "Loading users..." : "Select user"}
                    </option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id} className="text-slate-900">
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Deadline</span>
                  <input
                    name="deadline"
                    type="date"
                    value={form.deadline}
                    onChange={updateField}
                    className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                  />
                </label>
              </div>
            )}

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                Late submission reason
              </span>
              <textarea
                name="lateSubmissionReason"
                value={form.lateSubmissionReason}
                onChange={updateField}
                placeholder="Add a valid reason to let the assignee open the form after the deadline."
                className="min-h-24 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45 transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
              />
              <p className="text-xs leading-6 text-white/45">
                Leave this blank if the task should close automatically when the deadline passes.
              </p>
            </label>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-white/65">Delivery setup</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Status</span>
                <select
                  name="status"
                  value={form.status}
                  onChange={updateField}
                  className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                >
                  {taskStatuses.map((status) => (
                    <option key={status} value={status} className="text-slate-900">
                      {displayTaskStatus(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Image preset</span>
                <select
                  name="image"
                  value={form.image}
                  onChange={updateField}
                  className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-sky-300 focus:shadow-[0_0_0_4px_rgba(125,211,252,0.18)]"
                >
                  {taskVisuals.map((value, index) => (
                    <option key={value} value={value} className="text-slate-900">
                      Visual {index + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Upload image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm text-slate-300 file:mr-4 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
              />
            </label>
          </div>

          {mode === "edit" ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Review decision</p>
              <p className="mt-3 text-sm leading-7 text-emerald-50/90">
                Choose an approval decision before saving if this edit is part of the submission review flow.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
                    Decision
                  </span>
                  <select
                    name="reviewDecision"
                    value={form.reviewDecision}
                    onChange={updateField}
                    className="h-11 rounded-xl border border-emerald-200/20 bg-white/10 px-3 text-sm text-white outline-none transition focus:border-emerald-200 focus:shadow-[0_0_0_4px_rgba(167,243,208,0.18)]"
                  >
                    <option value="" className="text-slate-900">
                      Leave unchanged
                    </option>
                    <option value="Approved" className="text-slate-900">
                      Approved
                    </option>
                    <option value="Rejected" className="text-slate-900">
                      Rejected
                    </option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/70">
                    Feedback
                  </span>
                  <textarea
                    name="reviewFeedback"
                    value={form.reviewFeedback}
                    onChange={updateField}
                    placeholder="Optional review note for the assignee"
                    className="min-h-24 rounded-xl border border-emerald-200/20 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-white/45 transition focus:border-emerald-200 focus:shadow-[0_0_0_4px_rgba(167,243,208,0.18)]"
                  />
                </label>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
            <div className="relative h-56 overflow-hidden">
              <img src={form.image} alt={form.title || "Task preview"} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.10),rgba(2,6,23,0.78))]" />
              <div className="absolute left-5 top-5">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[normalizeTaskStatus(form.status)]}`}>
                  {displayTaskStatus(form.status)}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <p className="font-display text-2xl font-semibold">{form.title || "Task title preview"}</p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {form.description || "A short task summary will appear here as you type."}
                </p>
              </div>
            </div>
            <div className="grid gap-4 p-5 text-sm text-slate-300">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <span>Assignee</span>
                <span className="font-medium text-white">{selectedUser?.name || "Select a teammate"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <span>Team</span>
                <span className="font-medium text-white">
                  {form.assignmentMode === "team" ? selectedTeam?.name || "Select a team" : selectedUserTeamName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <span>Deadline</span>
                <span className="font-medium text-white">{form.deadline || "No deadline set"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/8 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.28em] text-white/65">Publish action</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/80">
                {mode === "edit"
                  ? "Update the assignment and save the latest delivery setup."
                  : "Create the task and send it into the team workflow instantly."}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl border border-white/20 bg-white px-4 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create task"}
              </button>
            </div>
          </div>
        </form>
      </motion.aside>
    </div>
  );
}
