import { useEffect, useState } from "react";
import JSZip from "jszip";
import { motion } from "framer-motion";
import { resolveApiUrl } from "../../api/client";
import TaskDiscussionPanel from "./TaskDiscussionPanel";
import {
  displayPriority,
  displayTaskStatus,
  normalizePriority,
  normalizeTaskStatus,
  priorityTone,
  statusTone,
} from "../../lib/constants";
import { formatDate } from "../../lib/utils";

function DetailCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-950">{value ?? "--"}</p>
    </div>
  );
}

function ScorePill({ value, tone = "indigo" }) {
  const styles = {
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    rose: "bg-rose-100 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone] || styles.slate}`}>
      {value}
    </span>
  );
}

function confidencePercent(value) {
  const confidence = String(value || "").toLowerCase();
  if (confidence === "high") return 90;
  if (confidence === "medium") return 65;
  if (confidence === "low") return 35;
  return 0;
}

function renderCategoryBar(categoryScores = {}) {
  const segments = [
    { key: "relevance", color: "bg-sky-500" },
    { key: "completeness", color: "bg-emerald-500" },
    { key: "structure", color: "bg-amber-500" },
    { key: "clarity", color: "bg-violet-500" },
  ];

  return (
    <div className="overflow-hidden rounded-full bg-slate-200">
      <div className="flex h-2">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={segment.color}
            style={{ width: `${Number(categoryScores?.[segment.key]) || 0}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function getAiVerdict(score, flagged) {
  const normalizedScore = Number(score);
  if (Number.isFinite(normalizedScore) && normalizedScore >= 80) {
    return { label: "Auto-approved", tone: "emerald", note: "Meets the automatic approval threshold." };
  }

  if (Number.isFinite(normalizedScore) && normalizedScore < 50) {
    return { label: "Auto-rejected", tone: "rose", note: "Below the automatic rejection threshold." };
  }

  if (flagged) {
    return { label: "Needs review", tone: "amber", note: "Flagged for closer admin review." };
  }

  return { label: "Pending review", tone: "indigo", note: "AI scored the submission but left final review open." };
}

function getAttachmentKind(fileName = "", fileUrl = "") {
  const value = `${fileName} ${fileUrl}`.toLowerCase();

  if (value.includes(".pdf")) return "pdf";
  if (value.includes(".zip")) return "zip";
  if (/\.(doc|docx|xls|xlsx|ppt|pptx)(\?|#|$)/i.test(value)) return "document";
  if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/i.test(value)) return "image";

  return "file";
}

export default function TaskSubmissionModal({ open, onClose, task }) {
  const [zipEntries, setZipEntries] = useState([]);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadZipPreview() {
      if (!open || !task) {
        return;
      }

      const submissionLink = task.submission?.fileUrl;
      const normalizedSubmissionLink = typeof submissionLink === "string" ? submissionLink.trim() : "";
      const resolvedSubmissionLink = resolveApiUrl(normalizedSubmissionLink);
      const hasOpenableLink = /^(https?:\/\/|\/)/i.test(normalizedSubmissionLink);
      const attachmentKind = getAttachmentKind(task.submission?.fileName, normalizedSubmissionLink);

      if (!hasOpenableLink || attachmentKind !== "zip") {
        setZipEntries([]);
        setZipLoading(false);
        setZipError("");
        return;
      }

      setZipLoading(true);
      setZipError("");
      setZipEntries([]);

      try {
        const response = await fetch(resolvedSubmissionLink, { credentials: "include" });
        if (!response.ok) {
          throw new Error(`Unable to load ZIP file (${response.status})`);
        }

        const buffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const entries = Object.values(zip.files)
          .filter((file) => !file.dir)
          .map((file) => ({
            name: file.name,
            size: file._data?.uncompressedSize || file._data?.compressedSize || null,
          }));

        if (active) {
          setZipEntries(entries);
        }
      } catch (error) {
        if (active) {
          setZipError(error?.message || "Unable to preview this ZIP file");
          setZipEntries([]);
        }
      } finally {
        if (active) {
          setZipLoading(false);
        }
      }
    }

    loadZipPreview();

    return () => {
      active = false;
    };
  }, [open, task]);

  if (!open || !task) {
    return null;
  }

  const status = normalizeTaskStatus(task.status);
  const priority = normalizePriority(task.priority);
  const submittedAt = formatDate(task.submission?.submittedAt);
  const reviewedAt = formatDate(task.review?.reviewedAt);
  const submissionLink = task.submission?.fileUrl;
  const normalizedSubmissionLink = typeof submissionLink === "string" ? submissionLink.trim() : "";
  const resolvedSubmissionLink = resolveApiUrl(normalizedSubmissionLink);
  const hasOpenableLink = /^(https?:\/\/|\/)/i.test(normalizedSubmissionLink);
  const attachmentKind = getAttachmentKind(task.submission?.fileName, normalizedSubmissionLink);
  const isPdfLink = attachmentKind === "pdf";
  const isZipLink = attachmentKind === "zip";
  const isDocumentLink = attachmentKind === "document";
  const isImageLink = attachmentKind === "image";
  const canPreviewInline = hasOpenableLink && (isPdfLink || isImageLink);
  const aiEvaluation = task.aiEvaluation || null;
  const aiScore = aiEvaluation?.predictedScore;
  const aiVerdict = getAiVerdict(aiScore, aiEvaluation?.flagged);
  const aiVerdictText = aiEvaluation?.verdictLabel || aiVerdict.label;
  const aiTone = aiEvaluation?.flagged
    ? "amber"
    : aiEvaluation?.confidence === "high"
      ? "emerald"
      : aiEvaluation?.confidence === "medium"
        ? "indigo"
        : "rose";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#020617]/70 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.aside
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="relative z-10 w-full max-w-5xl overflow-y-auto rounded-[32px] border border-slate-200/20 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_50%,#f5f7fb_100%)] p-6 shadow-[0_30px_90px_rgba(2,6,23,0.28)] sm:max-h-[calc(100vh-2rem)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-blue-500">Submitted task view</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-slate-950">{task.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Review the assignee submission, attached references, and latest review notes before taking action.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>
            {displayTaskStatus(status)}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityTone[priority]}`}>
            {displayPriority(priority)} Priority
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailCard label="Assigned to" value={task.assignedUserName || task.assignedUser} />
          <DetailCard label="Deadline" value={formatDate(task.deadline)} />
          <DetailCard label="Submitted on" value={submittedAt} />
          <DetailCard label="Review decision" value={task.review?.decision || "Awaiting review"} />
        </div>

        {task?.reminders?.lateSubmissionReason ? (
          <section className="mt-6 rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-600">Late access reason</p>
            <p className="mt-3 text-sm leading-7 text-emerald-900">{task.reminders.lateSubmissionReason}</p>
          </section>
        ) : null}

        <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Task brief</p>
          <p className="mt-4 text-sm leading-7 text-slate-700">{task.description || "No task description available."}</p>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Submission details</p>
          <div className="mt-5 grid gap-5">
            <div>
              <p className="text-sm font-semibold text-slate-950">Submission note</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {task.submission?.text || "No submission note was provided."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">File name</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {task.submission?.fileName || "No file attached"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Submission link</p>
                {hasOpenableLink ? (
                  <a
                    href={resolvedSubmissionLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4"
                  >
                    Open submitted link
                  </a>
                ) : task.submission?.fileName ? (
                  <p className="mt-2 text-sm text-slate-600">
                    A file name was submitted, but there is no stored file URL to open yet.
                  </p>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-slate-950">No link attached</p>
                )}
              </div>
            </div>

            {hasOpenableLink ? (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Attachment type</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">
                  {isPdfLink
                    ? "PDF document"
                    : isZipLink
                      ? "ZIP archive"
                      : isDocumentLink
                        ? "Office document"
                        : isImageLink
                          ? "Image file"
                          : "General file"}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {isPdfLink
                    ? "This document can be previewed directly in the admin panel."
                    : isZipLink
                      ? "ZIP archives are opened as downloads. Use the link below to inspect the submitted package."
                      : isDocumentLink
                        ? "Office documents cannot be embedded safely in every browser, so use the open/download action below."
                      : isImageLink
                        ? "Images can be opened and reviewed in a new tab."
                        : "Open the attachment in a new tab to review it."}
                </p>
                <a
                  href={resolvedSubmissionLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {isZipLink ? "Download ZIP" : isDocumentLink ? "Open / Download document" : "Open attachment"}
                </a>
              </div>
            ) : task.submission?.fileName ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-500">Attachment unavailable</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{task.submission.fileName}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  The file name was saved, but this task does not have a stored file URL yet, so the admin view cannot
                  open a preview. Ask the user to resubmit the file so DTMS can store the attachment correctly.
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-indigo-100 bg-[linear-gradient(145deg,#eef2ff_0%,#f8faff_48%,#ffffff_100%)] p-6 shadow-[0_20px_60px_rgba(99,102,241,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-indigo-500">AI evaluation</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                DTMS predicted a score from the submission content and compared it with the task brief.
              </p>
            </div>
            {aiEvaluation ? (
              <ScorePill
                value={
                  aiScore !== undefined && aiScore !== null
                    ? `${aiScore}/100`
                    : aiEvaluation.confidence
                      ? aiEvaluation.confidence.toUpperCase()
                      : "PENDING"
                }
                tone={aiTone}
              />
            ) : null}
          </div>

          {aiEvaluation ? (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailCard label="Verdict" value={aiVerdictText} />
                <DetailCard label="Confidence" value={aiEvaluation.confidence || "--"} />
                <DetailCard label="Submission type" value={aiEvaluation.submissionType || "--"} />
                <DetailCard label="Recommendation" value={aiEvaluation.recommendation || "--"} />
                <DetailCard label="Source" value={aiEvaluation.source || "AI"} />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">AI feedback template</p>
                <p className="mt-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
                  {aiEvaluation.verdictReason || aiVerdict.note}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {aiEvaluation.feedback || aiEvaluation.summary || "No AI feedback is available yet."}
                </p>
                <div className="mt-4 grid gap-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
                      <span>Confidence meter</span>
                      <span>{aiEvaluation.confidence || "n/a"}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#22c55e_55%,#f59e0b_100%)]"
                        style={{ width: `${confidencePercent(aiEvaluation.confidence)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-slate-400">
                      <span>Category bar</span>
                      <span>Relevance / Completeness / Structure / Clarity</span>
                    </div>
                    {renderCategoryBar(aiEvaluation.categoryScores)}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Strengths</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {aiEvaluation.matchedTokens?.length ? aiEvaluation.matchedTokens.slice(0, 5).join(", ") : "No strong matching keywords yet."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Improve next</p>
                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        {aiEvaluation.missingTokens?.length ? aiEvaluation.missingTokens.slice(0, 5).join(", ") : aiVerdict.note}
                      </p>
                    </div>
                  </div>
                  {aiEvaluation.flagged ? (
                    <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      This submission was flagged for admin review because the score confidence or content match was low.
                    </p>
                  ) : null}
                  {aiEvaluation.expectedScoreRange ? (
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                      Auto-approve {aiEvaluation.expectedScoreRange.autoApprove}+ | Auto-reject below{" "}
                      {aiEvaluation.expectedScoreRange.autoReject}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Category scores</p>
                  <div className="mt-3 grid gap-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">Relevance</span>
                      <ScorePill value={`${aiEvaluation.categoryScores?.relevance ?? "--"}/100`} tone="indigo" />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">Completeness</span>
                      <ScorePill value={`${aiEvaluation.categoryScores?.completeness ?? "--"}/100`} tone="emerald" />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">Structure</span>
                      <ScorePill value={`${aiEvaluation.categoryScores?.structure ?? "--"}/100`} tone="amber" />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-600">Clarity</span>
                      <ScorePill value={`${aiEvaluation.categoryScores?.clarity ?? "--"}/100`} tone="rose" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Matched keywords</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {aiEvaluation.matchedTokens?.length ? aiEvaluation.matchedTokens.join(", ") : "No strong keyword matches yet."}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Missing keywords</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {aiEvaluation.missingTokens?.length ? aiEvaluation.missingTokens.join(", ") : "Nothing important was flagged as missing."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-slate-600">
              No AI evaluation has been stored for this submission yet. Once the user submits a file or link, the score
              will appear here automatically.
            </p>
          )}
        </section>

        {hasOpenableLink && isZipLink ? (
          <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">ZIP preview</p>
                <p className="mt-2 text-sm text-slate-600">
                  We read the archive in the browser and list the files inside it.
                </p>
              </div>
              <a
                href={resolvedSubmissionLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Download ZIP
              </a>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              {zipLoading ? (
                <p className="text-sm text-slate-600">Loading ZIP contents...</p>
              ) : zipError ? (
                <p className="text-sm leading-7 text-rose-600">{zipError}</p>
              ) : zipEntries.length ? (
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {zipEntries.length} file{zipEntries.length === 1 ? "" : "s"} found in archive
                  </p>
                  <ul className="mt-4 space-y-2">
                    {zipEntries.slice(0, 10).map((entry) => (
                      <li
                        key={entry.name}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white bg-white px-4 py-3"
                      >
                        <span className="truncate text-sm font-medium text-slate-700">{entry.name}</span>
                        {entry.size ? (
                          <span className="shrink-0 text-xs text-slate-400">
                            {Math.max(1, Math.round(entry.size / 1024))} KB
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {zipEntries.length > 10 ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Showing the first 10 files only.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm leading-7 text-slate-600">
                  The archive is ready to download. If the ZIP contains files, they will appear here after loading.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {canPreviewInline && isPdfLink ? (
          <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">PDF preview</p>
                <p className="mt-2 text-sm text-slate-600">The submitted PDF is rendered directly in the admin view.</p>
              </div>
              <a
                href={resolvedSubmissionLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
              >
                Open in new tab
              </a>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <iframe
                title={`${task.title} submission PDF`}
                src={resolvedSubmissionLink}
                className="h-[70vh] w-full bg-white"
              />
            </div>
          </section>
        ) : canPreviewInline && isImageLink ? (
          <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Image preview</p>
                <p className="mt-2 text-sm text-slate-600">The submitted image is rendered directly in the admin view.</p>
              </div>
              <a
                href={resolvedSubmissionLink}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
              >
                Open in new tab
              </a>
            </div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <img
                src={resolvedSubmissionLink}
                alt={`${task.title} submission`}
                className="max-h-[70vh] w-full object-contain bg-white"
              />
            </div>
          </section>
        ) : hasOpenableLink ? (
          <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Attachment review</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              This attachment type cannot be previewed inline in the browser. Use the open/download action above to
              inspect the submitted file.
            </p>
          </section>
        ) : null}

        <section className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(148,163,184,0.12)]">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Review history</p>
          <div className="mt-5 grid gap-4">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin feedback</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {task.review?.feedback || "No admin feedback has been added yet."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard label="Score" value={task.review?.score ?? "--"} />
              <DetailCard label="Reviewed on" value={reviewedAt} />
              <DetailCard label="Reviewed by" value={task.review?.reviewedBy || "--"} />
            </div>
          </div>
        </section>

        <TaskDiscussionPanel taskId={task.id} taskTitle={task.title} compact />
      </motion.aside>
    </div>
  );
}
