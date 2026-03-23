import prisma from "../lib/prisma.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildCalendarPanel, buildPremiumEmail, formatDateLabel } from "../utils/emailTemplates.js";
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
      actionUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/tasks`,
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

function buildAssignedTaskEmail({ taskTitle, description, status, deadline, assigneeName }) {
  const deadlineLabel = formatDateLabel(deadline);

  return {
    subject: `DTMS task assigned: ${taskTitle}`,
    text: [
      `You have been assigned "${taskTitle}".`,
      description ? `Details: ${description}` : null,
      status ? `Current status: ${formatTaskStatus(status)}` : null,
      deadlineLabel ? `Deadline: ${deadlineLabel}` : null,
      "Open DTMS to review the task.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildPremiumEmail({
      eyebrow: "DTMS Task Assignment",
      title: assigneeName ? `${assigneeName}, new task assigned` : "New task assigned",
      intro: `A task titled <strong>${taskTitle}</strong> has been assigned to you.`,
      actionLabel: "Open Task",
      actionUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/tasks`,
      footerNote: "Review the task details and update your progress in DTMS.",
      accent: "#2563eb",
      accentSoft: "#dbeafe",
      badgeTone: "#2563eb",
      details: [
        { label: "Task", value: taskTitle },
        ...(description ? [{ label: "Summary", value: description }] : []),
        ...(status ? [{ label: "Status", value: formatTaskStatus(status) }] : []),
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

function buildTaskDecisionEmail({ taskTitle, decision, feedback, deadline }) {
  const decisionLabel = decision === "Approved" ? "Approved" : "Rejected";
  const isApproved = decisionLabel === "Approved";
  const accent = isApproved ? "#059669" : "#e11d48";
  const accentSoft = isApproved ? "#d1fae5" : "#ffe4e6";
  const title = isApproved ? "Task approved" : "Task rejected";

  return {
    subject: `DTMS task ${decisionLabel.toLowerCase()}: ${taskTitle}`,
    text: [
      `Your task "${taskTitle}" has been ${decisionLabel.toLowerCase()}.`,
      feedback ? `Feedback: ${feedback}` : null,
      deadline ? `Deadline: ${formatDateLabel(deadline)}` : null,
      "Open DTMS to review the decision.",
    ]
      .filter(Boolean)
      .join("\n"),
    html: buildPremiumEmail({
      eyebrow: `DTMS ${decisionLabel}`,
      title,
      intro: `Your task <strong>${taskTitle}</strong> has been <strong>${decisionLabel.toLowerCase()}</strong>.`,
      actionLabel: "Open Task",
      actionUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/tasks`,
      footerNote: isApproved
        ? "Approval confirmed. You may continue in DTMS."
        : "Review the feedback, revise your work, and resubmit when ready.",
      accent,
      accentSoft,
      badgeTone: accent,
      details: [
        { label: "Task", value: taskTitle },
        { label: "Decision", value: decisionLabel },
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
    submission: task.submission,
    reminders: task.reminders,
    review: task.review
      ? {
          decision: task.review.decision,
          feedback: task.review.feedback,
          reviewedAt: task.review.reviewedAt,
          reviewedBy: task.review.reviewedBy,
        }
      : undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function getTasks(req, res, next) {
  try {
    const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };
    const tasks = await prisma.task.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
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
    const { title, description, deadline, lateSubmissionReason, assignedUser, assignedUserId, assignedTo, status } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const targetUserId = assignedUserId || assignedUser || assignedTo;
    if (!targetUserId) {
      return res.status(400).json({ message: "A valid assigned user is required" });
    }

    const userCount = await prisma.user.count({ where: { id: targetUserId } });
    if (userCount === 0) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        deadline: deadline ? new Date(deadline) : undefined,
        status: status || "PENDING",
        userId: targetUserId,
        reminders: buildLateSubmissionReminder(undefined, lateSubmissionReason, req.user.id),
      },
    });

    const populated = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (populated?.user?.email) {
      try {
        const assignmentEmail = buildAssignedTaskEmail({
          taskTitle: populated.title,
          description: populated.description || "",
          status: populated.status,
          deadline: populated.deadline,
          assigneeName: populated.user.name,
        });

        await sendEmail({
          to: populated.user.email,
          subject: assignmentEmail.subject,
          text: assignmentEmail.text,
          html: assignmentEmail.html,
        });
      } catch (emailError) {
        console.error("Task assignment email failed", emailError);
      }
    }

    return res.status(201).json({
      task: serializeTask(populated),
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
      assignedUser,
      assignedUserId,
      assignedTo,
      status,
      submissionText,
      submissionFileName,
      submissionFileUrl,
      submissionFileData,
      reviewDecision,
      reviewFeedback,
    } = req.body;

    if (!taskId) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
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
      if (lateSubmissionReason !== undefined) {
        update.reminders = buildLateSubmissionReminder(existing.reminders, lateSubmissionReason, req.user.id);
      }
      if (typeof status === "string") update.status = status;
      if (reviewDecision === "Approved" || reviewDecision === "Rejected") {
        update.review = {
          decision: reviewDecision,
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
        submissionFileData !== undefined
      ) {
        let nextSubmissionFileUrl = submissionFileUrl ? String(submissionFileUrl).trim() : undefined;

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
          fileUrl: nextSubmissionFileUrl,
          submittedAt: new Date(),
        };
        update.status = "PENDING_REVIEW";
        update.reminders = {
          ...(existing.reminders && typeof existing.reminders === "object" ? existing.reminders : {}),
          submissionSentAt: new Date(),
        };
      }
    }

    const targetUserId = assignedUserId || assignedUser || assignedTo;
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
      },
    });

    const submissionSaved =
      !isAdmin &&
      (submissionText !== undefined || submissionFileName !== undefined || submissionFileUrl !== undefined);

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

    if (isAdmin && (reviewDecision === "Approved" || reviewDecision === "Rejected") && task.user?.email) {
      try {
        const decisionEmail = buildTaskDecisionEmail({
          taskTitle: task.title,
          decision: reviewDecision,
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

    return res.json({
      task: serializeTask(task),
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
