import prisma from "../lib/prisma.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildCalendarPanel, buildPremiumEmail, formatDateLabel } from "../utils/emailTemplates.js";
import { evaluateSubmission as evaluateTaskSubmission } from "../lib/submissionEvaluation.js";
import { getAiWorkflowSettings } from "../lib/aiWorkflowSettings.js";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, "../../uploads");

function sanitizeFileName(fileName) {
  return String(fileName || "submission")
    .replace(/[^\w.\- ]+/g, "")
    .trim();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function parseEmailList(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[\n,;]+/)
        .map((item) => item.trim());

  return [...new Set(values.map(normalizeEmail).filter(Boolean))];
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePriority(priority) {
  const normalized = String(priority || "MEDIUM").trim().toUpperCase();
  return ["LOW", "MEDIUM", "HIGH"].includes(normalized) ? normalized : "MEDIUM";
}

function normalizeAssignedTarget(...values) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function resolveStoredUploadPath(fileUrl) {
  if (typeof fileUrl !== "string" || !fileUrl.startsWith("/uploads/")) {
    return null;
  }

  const fileName = path.basename(fileUrl);
  return path.join(uploadsDirectory, fileName);
}

async function removeStoredUpload(fileUrl) {
  const uploadPath = resolveStoredUploadPath(fileUrl);
  if (!uploadPath) {
    return;
  }

  await fs.unlink(uploadPath).catch(() => undefined);
}

async function saveUploadedSubmission({ fileName, fileData }) {
  const matches = String(fileData || "").match(/^data:(.+?);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid uploaded file data");
  }

  const [, mimeType, base64Payload] = matches;
  const fileBuffer = Buffer.from(base64Payload, "base64");
  const safeName = sanitizeFileName(fileName);
  const extension = path.extname(safeName) || (mimeType === "application/pdf" ? ".pdf" : "");
  const storedFileName = `${Date.now()}-${randomUUID()}${extension}`;

  await fs.mkdir(uploadsDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadsDirectory, storedFileName), fileBuffer);

  return `/uploads/${storedFileName}`;
}

function formatTaskStatus(status) {
  return String(status || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function isDateOverdue(deadline) {
  if (!deadline) {
    return false;
  }

  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) {
    return false;
  }

  return deadlineDate.setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
}

function getLateSubmissionReason(reminders) {
  if (!reminders || typeof reminders !== "object") {
    return "";
  }

  return typeof reminders.lateSubmissionReason === "string" ? reminders.lateSubmissionReason.trim() : "";
}

async function loadProfilePhotoMap(emails = []) {
  const uniqueEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))];

  if (!uniqueEmails.length) {
    return new Map();
  }

  const profiles = await prisma.user.findMany({
    where: { email: { in: uniqueEmails } },
    select: { email: true, profilePhoto: true },
  });
  return new Map(
    profiles.map((profile) => [normalizeEmail(profile.email), typeof profile.profilePhoto === "string" ? profile.profilePhoto : null]),
  );
}

async function loadTeamRecipients(teamId) {
  if (!teamId) {
    return [];
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: { select: { id: true, name: true, email: true, role: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!team) {
    return null;
  }

  const recipients = [...team.members];
  if (team.leaderId) {
    const leader = await prisma.user.findUnique({
      where: { id: team.leaderId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (leader && !recipients.some((member) => member.id === leader.id)) {
      recipients.unshift(leader);
    }
  }

  return {
    team,
    recipients: recipients.filter((member) => member.role !== "ADMIN"),
  };
}

function toCommentAuthor(user, profilePhoto = null) {
  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
    role: user.role,
    avatar: profilePhoto || null,
  };
}

function normalizeDiscussionItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      id: item.id || randomUUID(),
      parentId: item.parentId || null,
      message: String(item.message || "").trim(),
      createdAt: item.createdAt || new Date(),
      editedAt: item.editedAt || null,
      author: item.author || null,
    }))
    .filter((item) => item.message);
}

function buildDiscussionTree(items = []) {
  const nodes = items.map((item) => ({
    ...item,
    replies: [],
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = [];

  nodes.forEach((node) => {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId).replies.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortThread = (thread) => {
    thread.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    thread.forEach((item) => sortThread(item.replies));
  };

  sortThread(roots);

  return roots;
}

function getDiscussionMeta(items = []) {
  const normalized = normalizeDiscussionItems(items);
  const latestComment = normalized.reduce((latest, item) => {
    const currentTime = new Date(item.createdAt).getTime();
    const latestTime = latest ? new Date(latest.createdAt).getTime() : 0;

    if (Number.isNaN(currentTime)) {
      return latest;
    }

    return !latest || currentTime >= latestTime ? item : latest;
  }, null);
  const lastCommentAt = normalized.reduce((latest, item) => {
    const currentTime = new Date(item.createdAt).getTime();
    return Number.isNaN(currentTime) ? latest : Math.max(latest, currentTime);
  }, 0);

  return {
    commentCount: normalized.length,
    lastCommentAt: lastCommentAt ? new Date(lastCommentAt).toISOString() : null,
    lastCommentMessage: latestComment?.message || null,
    lastCommentAuthorName: latestComment?.author?.name || latestComment?.author?.email || null,
    lastCommentAuthorRole: latestComment?.author?.role || null,
  };
}

function collectDescendantIds(items, parentId) {
  const descendants = [];
  const stack = [parentId];

  while (stack.length) {
    const currentId = stack.pop();
    items.forEach((item) => {
      if (item.parentId === currentId) {
        descendants.push(item.id);
        stack.push(item.id);
      }
    });
  }

  return descendants;
}

function canManageComment(comment, user) {
  if (!comment || !user) {
    return false;
  }

  return user.role === "ADMIN" || String(comment.author?.id || "") === String(user.id);
}

async function loadTaskByIdForCurrentUser(taskId, user) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  if (!task) {
    return null;
  }

  const isAdmin = user.role === "ADMIN";
  const isOwner = String(task.userId) === String(user.id);
  if (!isAdmin && !isOwner) {
    const error = new Error("You can only access your assigned tasks");
    error.statusCode = 403;
    throw error;
  }

  return task;
}

async function loadBulkTaskRecipients({ assignedUserId, assignedEmails, assignToAllUsers, assignedTeamId }) {
  if (assignedTeamId) {
    const teamResult = await loadTeamRecipients(assignedTeamId);
    if (!teamResult) {
      const error = new Error("Assigned team not found");
      error.statusCode = 404;
      throw error;
    }

    return teamResult;
  }

  if (assignToAllUsers) {
    return {
      recipients: await prisma.user.findMany({
        where: { role: { in: ["USER", "TEAM_LEADER"] } },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { createdAt: "asc" },
      }),
    };
  }

  const parsedEmails = parseEmailList(assignedEmails);
  if (parsedEmails.length > 0) {
    const invalidEmails = parsedEmails.filter((email) => !isValidEmail(email));
    if (invalidEmails.length > 0) {
      const error = new Error(`Invalid email address: ${invalidEmails[0]}`);
      error.statusCode = 400;
      throw error;
    }

    const users = await prisma.user.findMany({
      where: {
        role: { in: ["USER", "TEAM_LEADER"] },
        email: { in: parsedEmails },
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: "asc" },
    });

    const usersByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
    const missingEmails = parsedEmails.filter((email) => !usersByEmail.has(email));

    if (missingEmails.length > 0) {
      const error = new Error(`No registered user found for: ${missingEmails.slice(0, 5).join(", ")}`);
      error.statusCode = 404;
      error.missingEmails = missingEmails;
      throw error;
    }

    return {
      recipients: parsedEmails.map((email) => usersByEmail.get(email)).filter(Boolean),
    };
  }

  if (assignedUserId) {
    const user = await prisma.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true, name: true, email: true, role: true },
    });

    return {
      recipients: user ? [user] : [],
    };
  }

  return {
    recipients: [],
  };
}

async function sendTaskAssignmentEmail(task, meta = {}) {
  if (!task?.user?.email) {
    return;
  }

  const assignmentEmail = buildAssignedTaskEmail({
    taskTitle: task.title,
    description: task.description || "",
    status: task.status,
    priority: task.priority,
    deadline: task.deadline,
    assigneeName: task.user.name,
    assignedByName: meta.assignedByName || "DTMS Admin",
    assignedByRole: meta.assignedByRole || "Admin",
    teamName: meta.teamName || task.team?.name || null,
  });

  await sendEmail({
    to: task.user.email,
    subject: assignmentEmail.subject,
    text: assignmentEmail.text,
    html: assignmentEmail.html,
  });
}

async function dispatchAssignmentEmails(tasks) {
  const batchSize = 25;

  for (let index = 0; index < tasks.length; index += batchSize) {
    const batch = tasks.slice(index, index + batchSize);
    await Promise.allSettled(batch.map((task) => sendTaskAssignmentEmail(task, task)));
  }
}


function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildLateSubmissionReminder(reminders, lateSubmissionReason, allowedBy) {
  const nextReminders = reminders && typeof reminders === "object" ? { ...reminders } : {};
  const reason = typeof lateSubmissionReason === "string" ? lateSubmissionReason.trim() : "";

  if (!reason) {
    delete nextReminders.lateSubmissionReason;
    delete nextReminders.lateSubmissionAllowedBy;
    delete nextReminders.lateSubmissionAllowedAt;
    return nextReminders;
  }

  nextReminders.lateSubmissionReason = reason;
  nextReminders.lateSubmissionAllowedBy = allowedBy || null;
  nextReminders.lateSubmissionAllowedAt = new Date();
  return nextReminders;
}

function buildSubmissionNotificationEmail({ taskTitle, status, submissionText, submissionFileName }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  return {
    subject: `DTMS submission received: ${taskTitle}`,
    text: [
      `A submission was received for "${taskTitle}".`,
      `Status: ${formatTaskStatus(status) || "Updated"}.`,
      submissionText ? `Note: ${submissionText}` : null,
      submissionFileName ? `Attachment: ${submissionFileName}` : null,
      "Open DTMS to review it.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildPremiumEmail({
      eyebrow: "DTMS Submission",
      title: "New task submission",
      intro: `A submission has been received for <strong>${taskTitle}</strong>. The task is now marked as <strong>${formatTaskStatus(status) || "Updated"}</strong>.`,
      actionLabel: "Review in DTMS",
      actionUrl: `${clientUrl}/tasks`,
      brandLogoUrl: `${clientUrl}/logo.png`,
      footerLogoUrl: `${clientUrl}/logo.png`,
      footerMessage: "Thank you for using DTMS.",
      footerNote: "Review the submission in DTMS and continue the workflow.",
      accent: "#2563eb",
      accentSoft: "#dbeafe",
      badgeTone: "#2563eb",
      details: [
        { label: "Task", value: taskTitle },
        { label: "Status", value: formatTaskStatus(status) || "Updated" },
        ...(submissionText ? [{ label: "Submission Note", value: submissionText }] : []),
        ...(submissionFileName ? [{ label: "Attachment", value: submissionFileName }] : []),
      ],
    }),
  };
}

function buildAssignedTaskEmail({ taskTitle, description, status, priority, deadline, assigneeName, assignedByName, assignedByRole, teamName }) {
  const deadlineLabel = formatDateLabel(deadline);
  const dashboardUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/tasks`;
  const contactEmail = process.env.CONTACT_EMAIL || "support@dtms.com";

  return {
    subject: `DTMS: New task assigned - ${taskTitle}`,
    text: [
      `Dear ${assigneeName || "Student"},`,
      "",
      "This email is to inform you about an important update in the Digital Talent Management System.",
      "",
      `Task Title: ${taskTitle}`,
      `Assigned By: ${assignedByName}${assignedByRole ? ` / ${assignedByRole}` : ""}`,
      teamName ? `Team: ${teamName}` : null,
      `Deadline: ${deadlineLabel || "Not set"}`,
      `Priority Level: ${priority || "MEDIUM"}`,
      description ? `Task Details: ${description}` : null,
      "",
      `System Access Link: ${dashboardUrl}`,
      "",
      "Kindly log in to the system and review the task details at your earliest convenience.",
      "Please ensure the task is completed and submitted before the deadline.",
      "",
      "If you have any questions or require further clarification, feel free to reach out.",
      "",
      `Best regards,`,
      assignedByName || "DTMS Admin",
      assignedByRole || "Admin",
      "Digital Talent Management System",
      contactEmail,
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildPremiumEmail({
      eyebrow: "Task Notification",
      title: assigneeName ? `${assigneeName}, you have a new task` : "You have a new task",
      intro: `
        Dear ${assigneeName || "Student"},<br /><br />
        This email is to inform you about an important update in the <strong>Digital Talent Management System</strong>.<br /><br />
        <strong>Task Details:</strong><br />
        • Task Title: ${taskTitle}<br />
        • Assigned By: ${assignedByName}${assignedByRole ? ` / ${assignedByRole}` : ""}<br />
        ${teamName ? `• Team: ${teamName}<br />` : ""}
        • Deadline: ${deadlineLabel || "Not set"}<br />
        • Priority Level: ${priority || "MEDIUM"}<br /><br />
        Kindly log in to the system and review the task details at your earliest convenience. Please ensure the task is completed and submitted before the deadline.
      `,
      actionLabel: "Open Dashboard",
      actionUrl: dashboardUrl,
      footerLogoUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/logo.png`,
      footerMessage: "Thank you for using DTMS.",
      footerNote: `If you have any questions or require further clarification, feel free to reach out at ${contactEmail}.`,
      accent: "#2563eb",
      accentSoft: "#dbeafe",
      badgeTone: "#2563eb",
      details: [
        { label: "Task", value: taskTitle },
        { label: "Assigned By", value: `${assignedByName}${assignedByRole ? ` / ${assignedByRole}` : ""}` },
        ...(teamName ? [{ label: "Team", value: teamName }] : []),
        ...(description ? [{ label: "Summary", value: description }] : []),
        ...(status ? [{ label: "Status", value: formatTaskStatus(status) }] : []),
        ...(priority ? [{ label: "Priority", value: String(priority).toUpperCase() }] : []),
        ...(deadlineLabel ? [{ label: "Deadline", value: deadlineLabel }] : []),
      ],
      extraHtml: deadline
        ? buildCalendarPanel({
            label: "Task deadline",
            title: deadlineLabel || "No deadline",
            date: "Plan your work before this date",
            caption: "Use DTMS to stay on schedule.",
          })
        : "",
    }),
  };
}

function buildTaskDecisionEmail({ taskTitle, decision, feedback, score, deadline }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const decisionLabel = decision === "Approved" ? "Approved" : "Rejected";
  const isApproved = decisionLabel === "Approved";
  const accent = isApproved ? "#059669" : "#e11d48";
  const accentSoft = isApproved ? "#d1fae5" : "#ffe4e6";
  const title = isApproved ? "Task approved" : "Task rejected";
  const scoreLabel = score === null || score === undefined || score === "" ? "Not recorded" : `${score}/100`;
  const scoreText = isApproved ? `Score awarded: ${scoreLabel}.` : "Score was not sent for this rejection.";

  return {
    subject: isApproved && scoreLabel
      ? `DTMS task approved: ${taskTitle} (${scoreLabel})`
      : `DTMS task ${decisionLabel.toLowerCase()}: ${taskTitle}`,
    text: [
      `Your task "${taskTitle}" has been ${decisionLabel.toLowerCase()}.`,
      scoreText,
      feedback ? `Feedback: ${feedback}` : null,
      deadline ? `Deadline: ${formatDateLabel(deadline)}` : null,
      "Open DTMS to review the decision.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildPremiumEmail({
      eyebrow: `DTMS ${decisionLabel}`,
      title,
      intro: `Your task <strong>${taskTitle}</strong> has been <strong>${decisionLabel.toLowerCase()}</strong>. ${isApproved ? `Your score is <strong>${scoreLabel}</strong>.` : ""}`,
      actionLabel: "Open Task",
      actionUrl: `${clientUrl}/tasks`,
      brandLogoUrl: `${clientUrl}/logo.png`,
      footerLogoUrl: `${clientUrl}/logo.png`,
      footerMessage: "Thank you for using DTMS.",
      footerNote: isApproved
        ? "Approval confirmed. You may continue in DTMS."
        : "Review the feedback, revise your work, and resubmit when ready.",
      accent,
      accentSoft,
      badgeTone: accent,
      details: [
        { label: "Task", value: taskTitle },
        { label: "Decision", value: decisionLabel },
        ...(isApproved ? [{ label: "Score", value: scoreLabel }] : []),
        ...(feedback ? [{ label: "Feedback", value: feedback }] : []),
      ],
      extraHtml: deadline
        ? buildCalendarPanel({
            label: "Task deadline",
          title: formatDateLabel(deadline) || "No deadline",
          date: "Calendar view",
          caption: "Use DTMS to track the final delivery date.",
        })
        : "",
    }),
  };
}

function buildAiEvaluationEmail({
  taskTitle,
  score,
  feedback,
  flagged,
  autoApproved,
  autoRejected,
  verdictLabel,
  verdictReason,
  thresholds,
  deadline,
}) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const isApproved = Boolean(autoApproved);
  const isRejected = Boolean(autoRejected);
  const accent = isApproved ? "#059669" : isRejected ? "#e11d48" : flagged ? "#d97706" : "#2563eb";
  const accentSoft = isApproved ? "#d1fae5" : isRejected ? "#ffe4e6" : flagged ? "#fef3c7" : "#dbeafe";
  const title = isApproved
    ? "Submission auto-approved"
    : isRejected
      ? "Submission auto-rejected"
      : "AI feedback for your submission";
  const scoreLabel = score === null || score === undefined || score === "" ? "Not recorded" : `${score}/100`;
  const verdictText = verdictLabel || (isApproved ? "Auto-approved" : isRejected ? "Auto-rejected" : "Needs review");

  return {
    subject: isApproved
      ? `DTMS auto-approved your submission: ${taskTitle} (${scoreLabel})`
      : isRejected
        ? `DTMS auto-rejected your submission: ${taskTitle} (${scoreLabel})`
        : `DTMS AI feedback: ${taskTitle} (${scoreLabel})`,
    text: [
      isApproved
        ? `Your submission for "${taskTitle}" was automatically approved by DTMS AI.`
        : isRejected
          ? `Your submission for "${taskTitle}" was automatically rejected by DTMS AI.`
          : `DTMS AI reviewed your submission for "${taskTitle}".`,
      `Score: ${scoreLabel}`,
      verdictReason ? `Why: ${verdictReason}` : null,
      feedback ? `Feedback: ${feedback}` : null,
      flagged ? "The submission was flagged for closer review by an admin." : null,
      "Open DTMS to view the submission details.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildPremiumEmail({
      eyebrow: isApproved ? "AI Approval" : "AI Feedback",
        title,
        intro: isApproved
          ? `Your submission for <strong>${taskTitle}</strong> was automatically approved by DTMS AI with a score of <strong>${scoreLabel}</strong>.`
          : isRejected
            ? `Your submission for <strong>${taskTitle}</strong> was automatically rejected by DTMS AI with a score of <strong>${scoreLabel}</strong>.`
            : `DTMS AI reviewed your submission for <strong>${taskTitle}</strong> and assigned a score of <strong>${scoreLabel}</strong>.`,
      actionLabel: "Open Task",
      actionUrl: `${clientUrl}/tasks`,
      brandLogoUrl: `${clientUrl}/logo.png`,
      footerLogoUrl: `${clientUrl}/logo.png`,
      footerMessage: "Thank you for using DTMS.",
      footerNote: isApproved
        ? "Your work met the automatic approval threshold. You can continue with the next task."
        : isRejected
          ? "The submission did not meet the automatic acceptance threshold. Review the feedback and resubmit after improvements."
          : "Review the feedback, improve the submission, and resubmit if needed.",
      accent,
      accentSoft,
      badgeTone: accent,
      details: [
        { label: "Task", value: taskTitle },
        { label: "Score", value: scoreLabel },
        { label: "Verdict", value: verdictText },
        ...(thresholds
          ? [{ label: "Thresholds", value: `${thresholds.autoApproveThreshold}+ / ${thresholds.autoRejectThreshold}-` }]
          : []),
        ...(verdictReason ? [{ label: "Reason", value: verdictReason }] : []),
        ...(feedback ? [{ label: "Feedback", value: feedback }] : []),
        { label: "Status", value: verdictText },
        ...(flagged ? [{ label: "Flagged", value: "Yes" }] : []),
      ],
      extraHtml: deadline
        ? buildCalendarPanel({
            label: "Task deadline",
            title: formatDateLabel(deadline) || "No deadline",
            date: "Calendar view",
            caption: "Use DTMS to track the final delivery date.",
          })
        : "",
    }),
  };
}

function buildScreeningUnlockEmail({ taskTitle, score, verdictReason, feedback, deadline }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const scoreLabel = score === null || score === undefined || score === "" ? "Not recorded" : `${score}/100`;

  return {
    subject: `DTMS screening interview unlocked: ${taskTitle}`,
    text: [
      `Your submission for "${taskTitle}" unlocked the screening interview.`,
      `AI score: ${scoreLabel}.`,
      verdictReason ? `Reason: ${verdictReason}` : null,
      feedback ? `Feedback: ${feedback}` : null,
      "Open the screening interview in DTMS to continue.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildPremiumEmail({
      eyebrow: "Screening unlocked",
      title: "Your screening interview is ready",
      intro: `Your submission for <strong>${taskTitle}</strong> passed the automatic scoring gate and unlocked the screening interview. Your AI score was <strong>${scoreLabel}</strong>.`,
      actionLabel: "Start screening",
      actionUrl: `${clientUrl}/#/screening-interview`,
      brandLogoUrl: `${clientUrl}/logo.png`,
      footerLogoUrl: `${clientUrl}/logo.png`,
      footerMessage: "Your next step is ready in DTMS.",
      footerNote: "Open the screening interview and complete the next round when you are ready.",
      accent: "#2563eb",
      accentSoft: "#dbeafe",
      badgeTone: "#2563eb",
      details: [
        { label: "Task", value: taskTitle },
        { label: "AI score", value: scoreLabel },
        ...(verdictReason ? [{ label: "Reason", value: verdictReason }] : []),
        ...(feedback ? [{ label: "Feedback", value: feedback }] : []),
        ...(deadline ? [{ label: "Deadline", value: formatDateLabel(deadline) || "No deadline" }] : []),
        { label: "Next round", value: "Screening interview" },
      ],
    }),
  };
}

function serializeTask(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    deadline: task.deadline,
    status: task.status,
    priority: task.priority,
    assignedTo: task.userId,
    assignedUser: task.user
      ? {
          id: task.user.id,
          name: task.user.name,
          email: task.user.email,
          role: task.user.role,
        }
      : undefined,
    teamId: task.teamId || null,
    team: task.team
      ? {
          id: task.team.id,
          name: task.team.name,
        }
      : null,
    submission: task.submission,
    aiEvaluation: task.aiEvaluation || null,
    reminders: task.reminders,
    discussion: task.discussion,
    discussionMeta: getDiscussionMeta(task.discussion),
    review: task.review
      ? {
        decision: task.review.decision,
        score: task.review.score,
        feedback: task.review.feedback,
        reviewedAt: task.review.reviewedAt,
        reviewedBy: task.review.reviewedBy,
      }
      : undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function buildCommentRecord({ id, parentId = null, message, author, createdAt = new Date() }) {
  return {
    id: id || randomUUID(),
    parentId: parentId || null,
    message: String(message || "").trim(),
    author,
    createdAt,
  };
}

export async function getTaskDiscussion(req, res, next) {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await loadTaskByIdForCurrentUser(taskId, req.user);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const comments = normalizeDiscussionItems(task.discussion);
    const profileMap = await loadProfilePhotoMap([
      ...comments.map((comment) => comment.author?.email),
      req.user.email,
    ]);

    const resolvedComments = comments.map((comment) => ({
      ...comment,
      author: {
        ...comment.author,
        avatar: profileMap.get(normalizeEmail(comment.author?.email)) || comment.author?.avatar || null,
      },
    }));

    return res.status(200).json({
      comments: buildDiscussionTree(resolvedComments),
      totalComments: resolvedComments.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function addTaskComment(req, res, next) {
  try {
    const { taskId } = req.params;
    const { message, parentId } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const trimmedMessage = String(message || "").trim();
    if (!trimmedMessage) {
      return res.status(400).json({ message: "Comment message is required" });
    }

    const task = await loadTaskByIdForCurrentUser(taskId, req.user);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const discussion = normalizeDiscussionItems(task.discussion);
    const profileMap = await loadProfilePhotoMap([req.user.email]);
    const author = toCommentAuthor(req.user, profileMap.get(normalizeEmail(req.user.email)) || null);
    const comment = buildCommentRecord({
      parentId: parentId || null,
      message: trimmedMessage,
      author,
    });

    if (comment.parentId && !discussion.some((item) => item.id === comment.parentId)) {
      return res.status(400).json({ message: "Reply target not found" });
    }

    discussion.push(comment);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { discussion },
    });

    return res.status(201).json({
      comment,
      comments: buildDiscussionTree(normalizeDiscussionItems(updatedTask.discussion)),
      totalComments: discussion.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTaskComment(req, res, next) {
  try {
    const { taskId, commentId } = req.params;
    const { message } = req.body;

    if (!taskId || !commentId) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    const trimmedMessage = String(message || "").trim();
    if (!trimmedMessage) {
      return res.status(400).json({ message: "Comment message is required" });
    }

    const task = await loadTaskByIdForCurrentUser(taskId, req.user);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const discussion = normalizeDiscussionItems(task.discussion);
    const commentIndex = discussion.findIndex((item) => item.id === commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const existingComment = discussion[commentIndex];
    if (!canManageComment(existingComment, req.user)) {
      return res.status(403).json({ message: "You can only edit your own comment" });
    }

    discussion[commentIndex] = {
      ...existingComment,
      message: trimmedMessage,
      editedAt: new Date(),
    };

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { discussion },
    });

    return res.status(200).json({
      comment: discussion[commentIndex],
      comments: buildDiscussionTree(normalizeDiscussionItems(updatedTask.discussion)),
      totalComments: discussion.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTaskComment(req, res, next) {
  try {
    const { taskId, commentId } = req.params;

    if (!taskId || !commentId) {
      return res.status(400).json({ message: "Invalid comment id" });
    }

    const task = await loadTaskByIdForCurrentUser(taskId, req.user);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const discussion = normalizeDiscussionItems(task.discussion);
    const targetComment = discussion.find((item) => item.id === commentId);
    if (!targetComment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (!canManageComment(targetComment, req.user)) {
      return res.status(403).json({ message: "You can only delete your own comment" });
    }

    const descendantIds = collectDescendantIds(discussion, commentId);
    const removalIds = new Set([commentId, ...descendantIds]);
    const nextDiscussion = discussion.filter((item) => !removalIds.has(item.id));

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { discussion: nextDiscussion },
    });

    return res.status(200).json({
      message: "Comment deleted",
      comments: buildDiscussionTree(normalizeDiscussionItems(updatedTask.discussion)),
      totalComments: nextDiscussion.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTasks(req, res, next) {
  try {
    const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };
    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      tasks: tasks.map(serializeTask),
    });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req, res, next) {
  try {
    const {
      title,
      description,
      deadline,
      lateSubmissionReason,
      priority,
      assignedUser,
      assignedUserId,
      assignedTo,
      assignedEmails,
      assignToAllUsers,
      assignedTeamId,
      status,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const targetUserId = normalizeAssignedTarget(assignedUserId, assignedUser, assignedTo);
    const recipientResult = await loadBulkTaskRecipients({
      assignedUserId: targetUserId,
      assignedEmails,
      assignToAllUsers,
      assignedTeamId,
    });
    const targetUsers = recipientResult?.recipients || [];
    const targetTeam = recipientResult?.team || null;

    if (targetUsers.length === 0) {
      return res.status(400).json({
        message: "A valid assigned user, email list, or bulk target is required",
      });
    }

    const baseData = {
      title: title.trim(),
      description: description?.trim(),
      deadline: deadline ? new Date(deadline) : undefined,
      priority: normalizePriority(priority),
      status: status || "PENDING",
      reminders: buildLateSubmissionReminder(undefined, lateSubmissionReason, req.user.id),
      teamId: targetTeam?.id || undefined,
    };

    const createdTasks = [];
    const taskCreationBatches = chunkArray(targetUsers, 20);

    for (const batch of taskCreationBatches) {
      const createdBatch = await Promise.all(
        batch.map(async (user) => {
          const task = await prisma.task.create({
            data: {
              ...baseData,
              userId: user.id,
              teamId: targetTeam?.id || null,
            },
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
              team: { select: { id: true, name: true } },
            },
          });

          return serializeTask({
            ...task,
            user,
          });
        }),
      );

      createdTasks.push(...createdBatch);
    }

    if (createdTasks.length === 1) {
      try {
        await sendTaskAssignmentEmail(
          {
            ...createdTasks[0],
            user: targetUsers[0],
          },
          {
            assignedByName: req.user.name || "DTMS Admin",
            assignedByRole: req.user.role || "Admin",
            teamName: targetTeam?.name || null,
          },
        );
      } catch (emailError) {
        console.error("Task assignment email failed", emailError);
      }

    }
    return res.status(201).json({
      message: `Task assigned to ${createdTasks.length} students`,
      tasks: createdTasks,
      count: createdTasks.length,
      team: targetTeam
        ? {
            id: targetTeam.id,
            name: targetTeam.name,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      deadline,
      lateSubmissionReason,
      priority,
      assignedUser,
      assignedUserId,
      assignedTo,
      status,
      submissionText,
      submissionFileName,
      submissionFileUrl,
      githubUrl,
      submissionFileData,
      reviewDecision,
      reviewScore,
      reviewFeedback,
    } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAdmin = req.user.role === "ADMIN";
    const isOwner = String(existing.userId) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "You can only update your assigned tasks" });
    }

    const adminTaskFieldsTouched =
      isAdmin &&
      (typeof title === "string" ||
        typeof description === "string" ||
        deadline !== undefined ||
        lateSubmissionReason !== undefined ||
        typeof status === "string" ||
        assignedUser !== undefined ||
        assignedUserId !== undefined ||
        assignedTo !== undefined);

    const update = {};
    if (isAdmin) {
      if (typeof title === "string") update.title = title.trim();
      if (typeof description === "string") update.description = description.trim();
      if (deadline !== undefined) update.deadline = deadline ? new Date(deadline) : null;
      if (priority !== undefined) update.priority = normalizePriority(priority);
      if (lateSubmissionReason !== undefined) {
        update.reminders = buildLateSubmissionReminder(existing.reminders, lateSubmissionReason, req.user.id);
      }
      if (typeof status === "string") update.status = status;
      if (reviewDecision === "Approved" || reviewDecision === "Rejected") {
        const parsedScore = reviewScore === undefined || reviewScore === null || reviewScore === ""
          ? null
          : Number(reviewScore);

        if (parsedScore !== null && (!Number.isFinite(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
          return res.status(400).json({ message: "Review score must be a number between 0 and 100" });
        }

        update.review = {
          decision: reviewDecision,
          score: parsedScore,
          feedback: reviewFeedback ? String(reviewFeedback).trim() : "",
          reviewedAt: new Date(),
          reviewedBy: req.user.id,
        };
        update.status = reviewDecision === "Approved" ? "COMPLETED" : "REJECTED";
      }
    } else {
      const lateSubmissionReason = getLateSubmissionReason(existing.reminders);
      if (isDateOverdue(existing.deadline) && !lateSubmissionReason) {
        return res.status(403).json({
          message: "The deadline has passed. Ask an admin to add a late submission reason before opening this form.",
        });
      }

      if (typeof status === "string") update.status = status;
      if (
        submissionText !== undefined ||
        submissionFileName !== undefined ||
        submissionFileUrl !== undefined ||
        githubUrl !== undefined ||
        submissionFileData !== undefined
      ) {
        let nextSubmissionFileUrl = submissionFileUrl ? String(submissionFileUrl).trim() : undefined;
        const nextGithubUrl = githubUrl ? String(githubUrl).trim() : undefined;

        if (submissionFileData) {
          nextSubmissionFileUrl = await saveUploadedSubmission({
            fileName: submissionFileName,
            fileData: submissionFileData,
          });

          if (existing.submission?.fileUrl && existing.submission.fileUrl !== nextSubmissionFileUrl) {
            await removeStoredUpload(existing.submission.fileUrl);
          }
        } else if (existing.submission?.fileUrl && existing.submission.fileUrl !== nextSubmissionFileUrl) {
          await removeStoredUpload(existing.submission.fileUrl);
        }

        update.submission = {
          text: submissionText ? String(submissionText).trim() : undefined,
          fileName: submissionFileName ? String(submissionFileName).trim() : undefined,
          fileUrl: nextSubmissionFileUrl || nextGithubUrl,
          githubUrl: nextGithubUrl,
          submittedAt: new Date(),
        };
        update.status = "PENDING_REVIEW";
        update.reminders = {
          ...(existing.reminders && typeof existing.reminders === "object" ? existing.reminders : {}),
          submissionSentAt: new Date(),
        };
      }
    }

    const targetUserId = normalizeAssignedTarget(assignedUserId, assignedUser, assignedTo);
    if (isAdmin && targetUserId !== undefined) {
      if (!targetUserId) {
        return res.status(400).json({ message: "Invalid assigned user id" });
      }
      const userCount = await prisma.user.count({ where: { id: targetUserId } });
      if (userCount === 0) {
        return res.status(404).json({ message: "Assigned user not found" });
      }
      update.userId = targetUserId;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: update,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    const submissionSaved =
      !isAdmin &&
      (submissionText !== undefined || submissionFileName !== undefined || submissionFileUrl !== undefined || githubUrl !== undefined);

    const notificationEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

    if (submissionSaved && notificationEmail) {
      try {
        const taskUpdateEmail = buildSubmissionNotificationEmail({
          taskTitle: task.title,
          status: task.status,
          submissionText: submissionText ? String(submissionText).trim() : "",
          submissionFileName: submissionFileName ? String(submissionFileName).trim() : "",
        });

        await sendEmail({
          to: notificationEmail,
          subject: taskUpdateEmail.subject,
          text: taskUpdateEmail.text,
          html: taskUpdateEmail.html,
        });
      } catch (emailError) {
        console.error("Submission email failed", emailError);
      }
    }

    if (isAdmin && adminTaskFieldsTouched && task.user?.email) {
      try {
        const assignmentEmail = buildAssignedTaskEmail({
          taskTitle: task.title,
          description: task.description || "",
          status: task.status,
          deadline: task.deadline,
          assigneeName: task.user.name,
        });

        await sendEmail({
          to: task.user.email,
          subject: assignmentEmail.subject,
          text: assignmentEmail.text,
          html: assignmentEmail.html,
        });
      } catch (emailError) {
        console.error("Task update email failed", emailError);
      }
    }

    if (isAdmin && reviewDecision === "Approved" && task.user?.email) {
      try {
        const decisionEmail = buildTaskDecisionEmail({
          taskTitle: task.title,
          decision: reviewDecision,
          score: task.review?.score ?? update.review?.score ?? null,
          feedback: reviewFeedback ? String(reviewFeedback).trim() : "",
          deadline: task.deadline,
        });

        await sendEmail({
          to: task.user.email,
          subject: decisionEmail.subject,
          text: decisionEmail.text,
          html: decisionEmail.html,
        });
      } catch (emailError) {
        console.error("Task decision email failed", emailError);
      }
    }

    if (isAdmin && reviewDecision === "Rejected" && task.user?.email) {
      try {
        const rejectionEmail = buildTaskDecisionEmail({
          taskTitle: task.title,
          decision: reviewDecision,
          feedback: reviewFeedback ? String(reviewFeedback).trim() : "",
          score: null,
          deadline: task.deadline,
        });

        await sendEmail({
          to: task.user.email,
          subject: rejectionEmail.subject,
          text: rejectionEmail.text,
          html: rejectionEmail.html,
        });
      } catch (emailError) {
        console.error("Task rejection email failed", emailError);
      }
    }

    let resolvedTask = task;

    if (submissionSaved) {
      try {
        const thresholdSettings = await getAiWorkflowSettings().catch(() => ({
          autoApproveThreshold: 80,
          autoRejectThreshold: 50,
          aiPromptRules: "",
        }));

        const evaluation = await evaluateTaskSubmission(task, {
          submissionText: submissionText ? String(submissionText).trim() : "",
          fileName: submissionFileName ? String(submissionFileName).trim() : "",
          fileUrl: submissionFileUrl ? String(submissionFileUrl).trim() : "",
          githubUrl: githubUrl ? String(githubUrl).trim() : "",
          fileData: submissionFileData || "",
        }, {
          aiWorkflowSettings: thresholdSettings,
        });

        const predictedScore = Number(evaluation?.predictedScore);
        const autoApproved =
          Number.isFinite(predictedScore) && predictedScore >= thresholdSettings.autoApproveThreshold;
        const autoRejected =
          Number.isFinite(predictedScore) && predictedScore < thresholdSettings.autoRejectThreshold;
        const aiFeedback = evaluation?.feedback || evaluation?.summary || "DTMS AI reviewed your submission.";

        const nextData = {
          aiEvaluation: {
            ...evaluation,
            thresholds: thresholdSettings,
          },
        };

        if (autoApproved) {
          nextData.review = {
            decision: "Approved",
            score: predictedScore,
            feedback: aiFeedback,
            reviewedAt: new Date(),
            reviewedBy: "AI",
          };
          nextData.status = "COMPLETED";
        } else if (autoRejected) {
          nextData.review = {
            decision: "Rejected",
            score: predictedScore,
            feedback: aiFeedback,
            reviewedAt: new Date(),
            reviewedBy: "AI",
          };
          nextData.status = "REJECTED";
        }

        resolvedTask = await prisma.task.update({
          where: { id: taskId },
          data: nextData,
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
            team: { select: { id: true, name: true } },
          },
        });

        if (task.user?.email) {
          try {
            const aiEmail = buildAiEvaluationEmail({
              taskTitle: task.title,
              score: evaluation.predictedScore,
              feedback: aiFeedback,
              flagged: Boolean(evaluation.flagged),
              autoApproved,
              autoRejected,
              verdictLabel: evaluation.verdictLabel,
              verdictReason: evaluation.verdictReason,
              thresholds: thresholdSettings,
              deadline: task.deadline,
            });

            await sendEmail({
              to: task.user.email,
              subject: aiEmail.subject,
              text: aiEmail.text,
              html: aiEmail.html,
            });
          } catch (emailError) {
            console.error("AI evaluation email failed", emailError);
          }
        }

        if (resolvedTask?.status === "COMPLETED" && resolvedTask.user?.email && !resolvedTask.aiEvaluation?.screeningInviteSentAt) {
          try {
            const screeningInviteEmail = buildScreeningUnlockEmail({
              taskTitle: task.title,
              score: evaluation.predictedScore,
              verdictReason: evaluation.verdictReason || aiFeedback,
              feedback: aiFeedback,
              deadline: task.deadline,
            });

            await sendEmail({
              to: resolvedTask.user.email,
              subject: screeningInviteEmail.subject,
              text: screeningInviteEmail.text,
              html: screeningInviteEmail.html,
            });

            resolvedTask = await prisma.task.update({
              where: { id: taskId },
              data: {
                aiEvaluation: {
                  ...(resolvedTask.aiEvaluation || {}),
                  screeningInviteSentAt: new Date().toISOString(),
                },
              },
              include: {
                user: { select: { id: true, name: true, email: true, role: true } },
                team: { select: { id: true, name: true } },
              },
            });
          } catch (emailError) {
            console.error("Screening invite email failed", emailError);
          }
        }

      } catch (evaluationError) {
        console.error("Submission AI evaluation failed", evaluationError);
      }
    }

    return res.json({
      task: serializeTask(resolvedTask),
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req, res, next) {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const deleted = await prisma.task.delete({ where: { id: taskId } }).catch(() => null);
    if (!deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function submitTaskScreeningRound(req, res, next) {
  try {
    const { taskId } = req.params;
    const { mcqAnswers, codingAnswer, skillRatings } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Simple scoring logic
    let score = 0;
    const totalQuestions = 3; // Based on frontend
    if (Array.isArray(mcqAnswers)) {
      // Assume correct answers are at index 1,1,0 based on frontend
      const correctAnswers = [1, 1, 0];
      mcqAnswers.forEach((answer, index) => {
        if (answer === correctAnswers[index]) score += 33;
      });
    }

    if (codingAnswer && typeof codingAnswer === "string" && codingAnswer.length > 10) {
      score += 34; // Bonus for coding answer
    }

    const passed = score >= 70;

    const screeningData = {
      mcqAnswers,
      codingAnswer,
      skillRatings,
      totalScore: score,
      passed,
      interviewUnlocked: passed,
      submittedAt: new Date(),
    };

    const existingAiEvaluation = task.aiEvaluation || {};
    const updatedAiEvaluation = {
      ...existingAiEvaluation,
      screening: screeningData,
    };

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { aiEvaluation: updatedAiEvaluation },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return res.json({
      task: serializeTask(updatedTask),
      screening: screeningData,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitTaskInterviewRound(req, res, next) {
  try {
    const { taskId } = req.params;
    const { answers, reflections, strengths } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Simple scoring logic
    let score = 0;
    if (Array.isArray(answers)) {
      answers.forEach((answer) => {
        if (answer && typeof answer === "string" && answer.length > 20) {
          score += 25; // 25 points per answer
        }
      });
    }

    if (reflections && typeof reflections === "string" && reflections.length > 50) {
      score += 25; // Bonus for reflections
    }

    if (Array.isArray(strengths) && strengths.length > 0) {
      score += Math.min(strengths.length * 5, 25); // Up to 25 points for strengths
    }

    const passed = score >= 60;

    const interviewData = {
      answers,
      reflections,
      strengths,
      interviewScore: score,
      passed,
      submittedAt: new Date(),
    };

    const existingAiEvaluation = task.aiEvaluation || {};
    const updatedAiEvaluation = {
      ...existingAiEvaluation,
      interview: interviewData,
    };

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { aiEvaluation: updatedAiEvaluation },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return res.json({
      task: serializeTask(updatedTask),
      interview: interviewData,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitTaskFinalSelection(req, res, next) {
  try {
    const { taskId } = req.params;

    if (!taskId) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.userId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const existingAiEvaluation = task.aiEvaluation || {};
    const interviewPassed = Boolean(existingAiEvaluation.interview?.passed);

    if (!interviewPassed) {
      return res.status(400).json({ message: "Interview must be passed before final selection" });
    }

    const finalSelectionData = {
      finalStatus: "selected",
      selectedAt: new Date(),
    };

    const updatedAiEvaluation = {
      ...existingAiEvaluation,
      finalSelection: finalSelectionData,
    };

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { aiEvaluation: updatedAiEvaluation },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        team: { select: { id: true, name: true } },
      },
    });

    return res.json({
      task: serializeTask(updatedTask),
      finalSelection: finalSelectionData,
    });
  } catch (error) {
    next(error);
  }
}
