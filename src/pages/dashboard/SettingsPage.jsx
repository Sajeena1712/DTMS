import { useEffect, useState } from "react";
import { resolveApiUrl } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

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
        name: profileForm.name,
        skills: toList(profileForm.skills),
        experience: profileForm.experience,
        education: profileForm.education,
        certifications: toList(profileForm.certifications),
        ...(photoFileData ? { photoFileData, photoFileName } : {}),
        ...(removePhoto ? { removePhoto: true } : {}),
      });
      setRemovePhoto(false);
    } finally {
      setSavingProfile(false);
    }
  }

  const displayedProfilePhoto = profilePhotoPreview || resolveApiUrl(user?.profilePhoto);

  return (
    <div className="space-y-6">
      <section className="task-panel p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Settings</p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-slate-950">Workspace preferences</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          Review your workspace identity, role access, and update your employee profile from one clean place.
        </p>
      </section>

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
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-5">
              <p className="text-sm font-semibold text-slate-950">Design system</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Premium glassmorphism surfaces, pastel accents, and rounded product cards are active for this workspace.
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
