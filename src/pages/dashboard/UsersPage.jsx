import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { bulkCreateAdminUsers, createAdminUser, fetchTeams, updateAdminUserTeam } from "../../api/adminApi";
import { fetchUsers } from "../../api/userApi";
import { showApiError } from "../../api/client";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "USER",
  assignedTeamId: "",
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualForm, setManualForm] = useState(emptyForm);
  const [csvText, setCsvText] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileData, setUploadFileData] = useState("");
  const uploadInputRef = useRef(null);

  async function loadData() {
    const [usersRes, teamsRes] = await Promise.all([fetchUsers(), fetchTeams()]);
    setUsers(usersRes.users || []);
    setTeams(teamsRes.teams || []);
  }

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setLoading(true);
        await loadData();
      } catch (error) {
        if (active) {
          setUsers([]);
          setTeams([]);
          showApiError(error, "Unable to load users");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  const teamOptions = useMemo(() => teams.map((team) => ({ id: team.id, name: team.name })), [teams]);

  function updateField(event) {
    const { name, value } = event.target;
    setManualForm((current) => ({ ...current, [name]: value }));
  }

  async function refresh() {
    const data = await fetchUsers();
    setUsers(data.users || []);
    const teamData = await fetchTeams();
    setTeams(teamData.teams || []);
  }

  async function handleManualSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await createAdminUser({
        name: manualForm.name.trim(),
        email: manualForm.email.trim(),
        password: manualForm.password,
        role: manualForm.role,
        assignedTeamId: manualForm.assignedTeamId || undefined,
      });
      toast.success("User created");
      setManualForm(emptyForm);
      await refresh();
    } catch (error) {
      showApiError(error, "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleCsvUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setUploadFileName(file.name);
      if (file.name.toLowerCase().endsWith(".xlsx")) {
        const fileData = await readFileAsDataUrl(file);
        setUploadFileData(fileData);
        setCsvText("");
      } else {
        const text = await file.text();
        setCsvText(text);
        setUploadFileData("");
        setUploadFileName(file.name);
      }
    } catch (error) {
      showApiError(error, "Unable to read user file");
    }
  }

  async function handleBulkSubmit(event) {
    event.preventDefault();
    if (!csvText.trim() && !uploadFileData) {
      toast.error("Paste CSV text or upload a CSV/XLSX file first");
      return;
    }

    setSaving(true);
    try {
      const response = await bulkCreateAdminUsers(
        uploadFileData ? { fileData: uploadFileData, fileName: uploadFileName } : { csvText },
      );
      toast.success(`Created ${response.count || 0} users`);
      setCsvText("");
      setUploadFileData("");
      setUploadFileName("");
      await refresh();
    } catch (error) {
      showApiError(error, "Failed to upload users");
    } finally {
      setSaving(false);
    }
  }

  async function handleTeamChange(userId, teamId) {
    try {
      await updateAdminUserTeam(userId, { teamId: teamId || null });
      toast.success(teamId ? "User moved to team" : "User removed from team");
      await refresh();
    } catch (error) {
      showApiError(error, "Failed to update user team");
    }
  }

  if (loading) {
    return (
      <section className="task-panel flex min-h-[40vh] items-center justify-center p-10">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 shadow-lg" />
          <p className="mt-4 text-slate-500">Loading users...</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">User management</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Provision users and teams</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Create individual accounts, upload a CSV or Excel list, and move users between teams from one admin workspace.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleManualSubmit} className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Manual creation</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Add a single user</h2>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Name</span>
              <input name="name" value={manualForm.name} onChange={updateField} className="task-select" required />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Email</span>
              <input type="email" name="email" value={manualForm.email} onChange={updateField} className="task-select" required />
            </label>
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Password</span>
              <input type="password" name="password" value={manualForm.password} onChange={updateField} className="task-select" required />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Role</span>
                <select name="role" value={manualForm.role} onChange={updateField} className="task-select">
                  <option value="USER">User</option>
                  <option value="TEAM_LEADER">Team Leader</option>
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Assigned team</span>
                <select name="assignedTeamId" value={manualForm.assignedTeamId} onChange={updateField} className="task-select">
                  <option value="">None</option>
                  {teamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Create user"}
            </button>
            <button type="button" onClick={() => setManualForm(emptyForm)} className="btn-secondary">
              Reset
            </button>
          </div>
        </form>

        <form onSubmit={handleBulkSubmit} className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Bulk upload</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">CSV or Excel user import</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Upload a CSV or Excel file with columns: `name,email,password,team`. If a team does not exist yet, DTMS will create it.
          </p>

          <div className="mt-6 grid gap-4">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleCsvUpload}
              className="task-select"
            />
            {uploadFileName ? <p className="text-xs text-slate-500">Selected file: {uploadFileName}</p> : null}
            <label className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Upload or paste data</span>
              <textarea
                value={csvText}
                onChange={(event) => {
                  setCsvText(event.target.value);
                  setUploadFileData("");
                  setUploadFileName("");
                }}
                className="task-textarea min-h-[220px]"
                placeholder="name,email,password,team"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Uploading..." : "Upload users"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCsvText("");
                setUploadFileData("");
                setUploadFileName("");
                if (uploadInputRef.current) {
                  uploadInputRef.current.value = "";
                }
              }}
              className="btn-secondary"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="task-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Directory</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Registered users</h2>
          </div>
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            {users.length} users
          </span>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/90 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Name</th>
                <th className="px-5 py-4 font-medium">Email</th>
                <th className="px-5 py-4 font-medium">Role</th>
                <th className="px-5 py-4 font-medium">Team</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((member) => (
                <tr key={member.id} className="border-t border-slate-200/70">
                  <td className="px-5 py-4 font-semibold text-slate-950">{member.name || "Unnamed"}</td>
                  <td className="px-5 py-4 text-slate-600">{member.email}</td>
                  <td className="px-5 py-4 text-slate-600">{member.role}</td>
                  <td className="px-5 py-4 text-slate-600">{member.teamName || "Unassigned"}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="task-select min-w-[180px]"
                        value={member.teamId || ""}
                        onChange={(event) => handleTeamChange(member.id, event.target.value)}
                      >
                        <option value="">Remove from team</option>
                        {teamOptions.map((team) => (
                          <option key={team.id} value={team.id}>
                            Move to {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-slate-500" colSpan={5}>
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
