import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAiSettings, updateAiSettings } from "../../api/aiApi";
import { showApiError } from "../../api/client";
import { resolveApiUrl } from "../../api/client";
import { assetPath } from "../../lib/assetPaths";
import { useAuth } from "../../contexts/AuthContext";
import { isAdminRole } from "../../lib/constants";

function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toCommaString(value) {
  return toList(value).join(", ");
}

function initials(value) {
  return (
    String(value || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "U"
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected file"));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [profileForm, setProfileForm] = useState({
    name: "",
    skills: "",
    experience: "",
    education: "",
    certifications: "",
  });
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");
  const [photoFileData, setPhotoFileData] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");
  const [removePhoto, setRemovePhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [aiSettings, setAiSettings] = useState({
    autoApproveThreshold: 80,
    autoRejectThreshold: 50,
    aiPromptRules: "",
  });
  const [savingAiSettings, setSavingAiSettings] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name || "",
      skills: toCommaString(user?.skills),
      experience: user?.experience || "",
      education: user?.education || "",
      certifications: toCommaString(user?.certifications),
    });
    setProfilePhotoPreview(user?.profilePhoto || "");
    setPhotoFileData("");
    setPhotoFileName("");
    setRemovePhoto(false);
  }, [user]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let active = true;

    getAiSettings()
      .then((data) => {
        if (!active || !data?.settings) {
          return;
        }

        setAiSettings({
          autoApproveThreshold: Number(data.settings.autoApproveThreshold) || 80,
          autoRejectThreshold: Number(data.settings.autoRejectThreshold) || 50,
          aiPromptRules:
            typeof data.settings.aiPromptRules === "string"
              ? data.settings.aiPromptRules
              : String(data.settings.aiPromptRules || ""),
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [isAdmin]);

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setProfilePhotoPreview(dataUrl);
    setPhotoFileData(dataUrl);
    setPhotoFileName(file.name);
    setRemovePhoto(false);
  }

  function clearPhoto() {
    setProfilePhotoPreview("");
    setPhotoFileData("");
    setPhotoFileName("");
    setRemovePhoto(true);
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSavingProfile(true);

    try {
      await updateProfile({
        name: profileForm.name.trim(),
        skills: toList(profileForm.skills),
        experience: profileForm.experience,
        education: profileForm.education,
        certifications: toList(profileForm.certifications),
        ...(photoFileData ? { photoFileData, photoFileName } : {}),
        ...(removePhoto ? { removePhoto: true } : {}),
      });
      setRemovePhoto(false);
      toast.success("Profile updated");
    } catch (error) {
      showApiError(error, "Unable to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAiSettingsSubmit(event) {
    event.preventDefault();
    setSavingAiSettings(true);

    try {
      const data = await updateAiSettings(aiSettings);
      if (data?.settings) {
        setAiSettings({
          autoApproveThreshold: Number(data.settings.autoApproveThreshold) || 80,
          autoRejectThreshold: Number(data.settings.autoRejectThreshold) || 50,
          aiPromptRules:
            typeof data.settings.aiPromptRules === "string"
              ? data.settings.aiPromptRules
              : String(data.settings.aiPromptRules || ""),
        });
      }
      toast.success("AI settings saved");
    } catch (error) {
      showApiError(error, "Unable to save AI settings");
    } finally {
      setSavingAiSettings(false);
    }
  }

  const displayedProfilePhoto = profilePhotoPreview || resolveApiUrl(user?.profilePhoto);

  return (
    <div className="space-y-6">
      <section className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Settings</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Workspace preferences</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Review your workspace identity and update your employee profile from one clean place.
        </p>
      </section>

      {isAdmin ? (
        <section className="task-panel p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">AI scoring</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold text-slate-950">AI threshold settings</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Change the automatic approval and rejection thresholds used by DTMS when scoring submissions.
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
              Auto-approve at {aiSettings.autoApproveThreshold}+ and auto-reject below {aiSettings.autoRejectThreshold}
            </div>
          </div>

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleAiSettingsSubmit}>
            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Auto-approve threshold</span>
              <input
                type="number"
                min="1"
                max="100"
                value={aiSettings.autoApproveThreshold}
                onChange={(event) =>
                  setAiSettings((current) => ({
                    ...current,
                    autoApproveThreshold: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Auto-reject threshold</span>
              <input
                type="number"
                min="0"
                max="99"
                value={aiSettings.autoRejectThreshold}
                onChange={(event) =>
                  setAiSettings((current) => ({
                    ...current,
                    autoRejectThreshold: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">AI prompt rules</span>
              <textarea
                rows={8}
                value={aiSettings.aiPromptRules}
                onChange={(event) =>
                  setAiSettings((current) => ({
                    ...current,
                    aiPromptRules: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-950 outline-none transition focus:border-blue-400"
                placeholder="Score against the task brief, reward relevance and completeness, and flag weak or suspicious submissions."
              />
            </label>

            <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingAiSettings}
                className="rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingAiSettings ? "Saving..." : "Save AI settings"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Account</p>
          <div className="mt-5 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(145deg,rgba(79,70,229,0.08),rgba(6,182,212,0.06),rgba(255,255,255,0.92))] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md">
                {displayedProfilePhoto ? (
                  <img src={displayedProfilePhoto} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-semibold text-blue-700">{initials(user?.name)}</span>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-950">{user?.name}</p>
                <p className="text-sm text-slate-600">{user?.email}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Role</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{user?.role}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Workspace</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">Digital Talent Management System</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Skills</p>
                <p className="mt-2 text-sm text-slate-700">
                  {toList(user?.skills).length ? toList(user?.skills).join(", ") : "No skills added yet."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Experience</p>
                <p className="mt-2 text-sm text-slate-700">{user?.experience || "No experience added yet."}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Education</p>
                <p className="mt-2 text-sm text-slate-700">{user?.education || "No education added yet."}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Certifications</p>
                <p className="mt-2 text-sm text-slate-700">
                  {toList(user?.certifications).length
                    ? toList(user?.certifications).join(", ")
                    : "No certifications added yet."}
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Profile management</p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Edit your profile</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Update your photo, skills, education, experience, and certifications from here.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Name</span>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-400"
                  placeholder="Your full name"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Skills</span>
              <textarea
                rows={3}
                value={profileForm.skills}
                onChange={(event) => setProfileForm((current) => ({ ...current, skills: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-400"
                placeholder="React, Node.js, MongoDB"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Experience</span>
              <textarea
                rows={4}
                value={profileForm.experience}
                onChange={(event) => setProfileForm((current) => ({ ...current, experience: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-400"
                placeholder="Add a short experience summary"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Education</span>
              <textarea
                rows={3}
                value={profileForm.education}
                onChange={(event) => setProfileForm((current) => ({ ...current, education: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-400"
                placeholder="College, degree, or training"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Certifications</span>
              <textarea
                rows={3}
                value={profileForm.certifications}
                onChange={(event) => setProfileForm((current) => ({ ...current, certifications: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-400"
                placeholder="AWS, Google Cloud, Scrum"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingProfile ? "Saving..." : "Save profile"}
              </button>
              <button
                type="button"
                onClick={clearPhoto}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Remove photo
              </button>
            </div>
          </form>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Preferences</p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5">
              <p className="text-sm font-semibold text-slate-950">Task notifications</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Stay informed about assignment updates, deadline changes, and submission reviews.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5">
              <p className="text-sm font-semibold text-slate-950">Workspace visibility</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep your dashboards aligned with current task status, chart insights, and team activity.
              </p>
            </div>
          </div>
        </article>

        <article className="task-panel p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Security</p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5">
              <p className="text-sm font-semibold text-slate-950">Email verification</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Verified email addresses keep login access and recovery flows working smoothly.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5">
              <p className="text-sm font-semibold text-slate-950">Profile privacy</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your profile data is visible inside the DTMS workspace for admin coordination and task management.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
