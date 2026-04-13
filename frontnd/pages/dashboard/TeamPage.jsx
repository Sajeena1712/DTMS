import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  bulkCreateAdminUsers,
  createTeam,
  deleteTeam,
  fetchTeamMembers,
  fetchTeams,
  updateTeam,
  updateAdminUserTeam,
} from "../../api/adminApi";
import { fetchUsers } from "../../api/userApi";
import { showApiError } from "../../api/client";
import { isAdminRole } from "../../lib/constants";
import { useAuth } from "../../contexts/AuthContext";

const emptyForm = {
  name: "",
  description: "",
  leaderId: "",
};

export default function TeamPage() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyForm);
  const [editingTeamId, setEditingTeamId] = useState("");
  const [memberToAddId, setMemberToAddId] = useState("");
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkFileData, setBulkFileData] = useState("");
  const bulkInputRef = useRef(null);

  async function loadTeams() {
    const data = await fetchTeams();
    setTeams(data.teams || []);
    if (!selectedTeamId && data.teams?.length) {
      setSelectedTeamId(data.teams[0].id);
    }
  }

  async function loadUsers() {
    const data = await fetchUsers();
    setUsers(data.users || []);
  }

  async function loadMembers(teamId) {
    if (!teamId) {
      setMembers([]);
      return;
    }

    const data = await fetchTeamMembers(teamId);
    setMembers(data.members || []);
  }

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        setLoading(true);
        await Promise.all([loadTeams(), loadUsers()]);
      } catch (error) {
        if (active) {
          setTeams([]);
          setUsers([]);
          showApiError(error, "Unable to load team data");
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

  useEffect(() => {
    let active = true;

    async function syncMembers() {
      try {
        await loadMembers(selectedTeamId);
      } catch (error) {
        if (active) {
          setMembers([]);
          showApiError(error, "Unable to load team members");
        }
      }
    }

    if (selectedTeamId) {
      syncMembers();
    } else {
      setMembers([]);
    }

    return () => {
      active = false;
    };
  }, [selectedTeamId]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) || null,
    [selectedTeamId, teams],
  );

  const leaderCandidates = useMemo(
    () => users.filter((member) => member.role !== "ADMIN"),
    [users],
  );

  const addableUsers = useMemo(
    () =>
      users.filter(
        (member) =>
          member.role !== "ADMIN" &&
          member.id !== selectedTeam?.leaderId &&
          member.teamId !== selectedTeamId,
      ),
    [selectedTeam?.leaderId, selectedTeamId, users],
  );

  function updateField(event) {
    const { name, value } = event.target;
    setTeamForm((current) => ({ ...current, [name]: value }));
  }

  function beginEdit(team) {
    setEditingTeamId(team.id);
    setTeamForm({
      name: team.name || "",
      description: team.description || "",
      leaderId: team.leaderId || "",
    });
  }

  function resetForm() {
    setEditingTeamId("");
    setTeamForm(emptyForm);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim(),
        leaderId: teamForm.leaderId || undefined,
      };

      if (editingTeamId) {
        await updateTeam(editingTeamId, payload);
        toast.success("Team updated");
      } else {
        await createTeam(payload);
        toast.success("Team created");
      }

      resetForm();
      const data = await fetchTeams();
      setTeams(data.teams || []);
    } catch (error) {
      showApiError(error, editingTeamId ? "Failed to update team" : "Failed to create team");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(teamId) {
    if (!window.confirm("Delete this team? Members will be unassigned from it.")) {
      return;
    }

    try {
      await deleteTeam(teamId);
      toast.success("Team deleted");
      const data = await fetchTeams();
      setTeams(data.teams || []);
      if (selectedTeamId === teamId) {
        setSelectedTeamId(data.teams?.[0]?.id || "");
      }
    } catch (error) {
      showApiError(error, "Failed to delete team");
    }
  }

  async function handleMoveMember(userId, nextTeamId) {
    try {
      await updateAdminUserTeam(userId, { teamId: nextTeamId || null });
      toast.success(nextTeamId ? "User moved" : "User removed from team");
      if (selectedTeamId) {
        const data = await fetchTeamMembers(selectedTeamId);
        setMembers(data.members || []);
      }
      const teamsRes = await fetchTeams();
      setTeams(teamsRes.teams || []);
      const usersRes = await fetchUsers();
      setUsers(usersRes.users || []);
    } catch (error) {
      showApiError(error, "Failed to update team member");
    }
  }

  async function handleAddMember(event) {
    event.preventDefault();
    if (!selectedTeamId || !memberToAddId) {
      toast.error("Choose a team and a member first");
      return;
    }

    try {
      await updateAdminUserTeam(memberToAddId, { teamId: selectedTeamId });
      toast.success("Member added to team");
      setMemberToAddId("");
      const membersData = await fetchTeamMembers(selectedTeamId);
      setMembers(membersData.members || []);
      const teamsRes = await fetchTeams();
      setTeams(teamsRes.teams || []);
      const usersRes = await fetchUsers();
      setUsers(usersRes.users || []);
    } catch (error) {
      showApiError(error, "Failed to add member");
    }
  }

  async function handleBulkFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setBulkFileName(file.name);
      if (file.name.toLowerCase().endsWith(".xlsx")) {
        const fileData = await readFileAsDataUrl(file);
        setBulkFileData(fileData);
        setBulkCsvText("");
      } else {
        const text = await file.text();
        setBulkCsvText(text);
        setBulkFileData("");
      }
    } catch (error) {
      showApiError(error, "Unable to read member file");
    }
  }

  async function handleBulkImport(event) {
    event.preventDefault();

    if (!selectedTeamId) {
      toast.error("Select a team first");
      return;
    }

    if (!bulkCsvText.trim() && !bulkFileData) {
      toast.error("Paste CSV text or upload a CSV/XLSX file first");
      return;
    }

    setSaving(true);
    try {
      const response = await bulkCreateAdminUsers(
        bulkFileData
          ? { fileData: bulkFileData, fileName: bulkFileName, assignedTeamId: selectedTeamId }
          : { csvText: bulkCsvText, assignedTeamId: selectedTeamId },
      );
      toast.success(`Created ${response.count || 0} users`);
      setBulkCsvText("");
      setBulkFileData("");
      setBulkFileName("");
      if (bulkInputRef.current) {
        bulkInputRef.current.value = "";
      }

      const membersData = await fetchTeamMembers(selectedTeamId);
      setMembers(membersData.members || []);
      const teamsRes = await fetchTeams();
      setTeams(teamsRes.teams || []);
      const usersRes = await fetchUsers();
      setUsers(usersRes.users || []);
    } catch (error) {
      showApiError(error, "Failed to upload team members");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="task-panel flex min-h-[40vh] items-center justify-center p-10">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 shadow-lg" />
          <p className="mt-4 text-slate-500">Loading teams...</p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Team management</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Admin team workspace</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Create teams, choose a team leader, view members, move users between teams, and remove users from a team.
        </p>
      </section>

      {isAdmin ? (
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleSubmit} className="task-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-blue-500">
                  {editingTeamId ? "Edit team" : "Create team"}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  {editingTeamId ? "Update team details" : "Add a new team"}
                </h2>
              </div>
              {editingTeamId ? (
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Team name</span>
                <input
                  name="name"
                  value={teamForm.name}
                  onChange={updateField}
                  className="task-select"
                  placeholder="Frontend Team"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Description</span>
                <textarea
                  name="description"
                  value={teamForm.description}
                  onChange={updateField}
                  className="task-textarea min-h-[120px]"
                  placeholder="What this team focuses on"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Team leader</span>
                <select name="leaderId" value={teamForm.leaderId} onChange={updateField} className="task-select">
                  <option value="">Optional</option>
                  {leaderCandidates.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Saving..." : editingTeamId ? "Update team" : "Create team"}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Reset
              </button>
            </div>
          </form>

          <section className="task-panel p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Teams</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Existing teams</h2>
            <div className="mt-5 grid gap-3">
              {teams.map((team) => (
                <article
                  key={team.id}
                  className={`rounded-3xl border p-4 ${selectedTeamId === team.id ? "border-blue-200 bg-blue-50/70" : "border-slate-200/80 bg-white/80"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{team.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{team.description || "No description"}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {team.memberCount} members
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedTeamId(team.id)} className="btn-secondary">
                      View members
                    </button>
                    <button type="button" onClick={() => beginEdit(team)} className="btn-secondary">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(team.id)} className="btn-secondary">
                      Delete
                    </button>
                  </div>
                </article>
              ))}
              {!teams.length ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
                  No teams created yet.
                </div>
              ) : null}
            </div>
          </section>
        </section>
      ) : null}

      <section className="task-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Team members</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">{selectedTeam?.name || "Select a team"}</h2>
          </div>
          <select
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value)}
            className="task-select max-w-sm"
          >
            <option value="">Choose a team</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleAddMember} className="mt-6 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid flex-1 gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Add member</span>
              <select
                className="task-select"
                value={memberToAddId}
                onChange={(event) => setMemberToAddId(event.target.value)}
                disabled={!selectedTeamId}
              >
                <option value="">{selectedTeamId ? "Choose a user" : "Select a team first"}</option>
                {addableUsers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || member.email}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn-primary" disabled={!selectedTeamId || !memberToAddId}>
              Add member
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            This adds an existing user to the selected team and updates their team assignment immediately.
          </p>
        </form>

        <form onSubmit={handleBulkImport} className="mt-6 rounded-[24px] border border-slate-200/80 bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Bulk member upload</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload CSV or Excel rows with <code>name,email,password,team</code>. If the team column is empty, DTMS assigns every new user to the selected team.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Upload file</span>
              <input
                ref={bulkInputRef}
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleBulkFileChange}
                className="task-select"
              />
            </label>

            {bulkFileName ? <p className="text-xs text-slate-500 md:col-span-2">Selected file: {bulkFileName}</p> : null}

            <label className="grid gap-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">CSV data</span>
              <textarea
                value={bulkCsvText}
                onChange={(event) => {
                  setBulkCsvText(event.target.value);
                  setBulkFileData("");
                  setBulkFileName("");
                }}
                className="task-textarea min-h-[180px]"
                placeholder="name,email,password,team"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className="btn-primary" disabled={!selectedTeamId || saving}>
              {saving ? "Uploading..." : "Upload members"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setBulkCsvText("");
                setBulkFileData("");
                setBulkFileName("");
                if (bulkInputRef.current) {
                  bulkInputRef.current.value = "";
                }
              }}
            >
              Clear
            </button>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200/80">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50/90 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Name</th>
                <th className="px-5 py-4 font-medium">Email</th>
                <th className="px-5 py-4 font-medium">Role</th>
                <th className="px-5 py-4 font-medium">Team</th>
                <th className="px-5 py-4 font-medium">Tasks</th>
                <th className="px-5 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-slate-200/70">
                  <td className="px-5 py-4 font-semibold text-slate-950">{member.name}</td>
                  <td className="px-5 py-4 text-slate-600">{member.email}</td>
                  <td className="px-5 py-4 text-slate-600">{member.role}</td>
                  <td className="px-5 py-4 text-slate-600">{member.teamName || "Unassigned"}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {member.completedTasks}/{member.totalTasks}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="task-select min-w-[180px]"
                        value={member.teamId || ""}
                        onChange={(event) => handleMoveMember(member.id, event.target.value)}
                      >
                        <option value="">Remove from team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            Move to {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {!members.length ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-slate-500" colSpan={6}>
                    Select a team to view its members.
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
