import Task from "../models/Task.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildCalendarPanel, buildPremiumEmail, formatDateLabel } from "../utils/emailTemplates.js";

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
const TWELVE_HOURS_IN_MS = 12 * 60 * 60 * 1000;

async function sendDeadlineReminder(task) {
  if (!task.assignedTo?.email) {
    return;
  }

  const deadlineLabel = formatDateLabel(task.deadline);

  await sendEmail({
    to: task.assignedTo.email,
    subject: `DTMS deadline reminder: ${task.title}`,
    text: [
      `Your task "${task.title}" is due on ${deadlineLabel}.`,
      "Please review your progress and submit before the deadline.",
    ].join("\n"),
    html: buildPremiumEmail({
      eyebrow: "DTMS Deadline Reminder",
      title: "Deadline approaching",
      intro: `Your task <strong>${task.title}</strong> is nearing its deadline.`,
      actionLabel: "Open Task",
      actionUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/tasks`,
      footerNote: "Review the task in DTMS and submit before the deadline.",
      accent: "#c2410c",
      accentSoft: "#ffedd5",
      badgeTone: "#c2410c",
      details: [
        { label: "Task", value: task.title },
        { label: "Due Date", value: deadlineLabel || "Scheduled soon" },
      ],
      extraHtml: buildCalendarPanel({
        label: "Calendar view",
        title: deadlineLabel || "Upcoming deadline",
        date: "Mark this date in your calendar",
        caption: "Use DTMS to review unfinished steps before the due date.",
      }),
    }),
  });
}

export async function runTaskReminderJob() {
  const now = new Date();
  const upcomingWindow = new Date(now.getTime() + THREE_DAYS_IN_MS);

  const dueSoonTasks = await Task.find({
    deadline: { $gte: now, $lte: upcomingWindow },
    status: { $ne: "COMPLETED" },
    $or: [
      { "reminders.dueSoonSentAt": { $exists: false } },
      { "reminders.dueSoonSentAt": null },
    ],
  }).populate("assignedTo", "name email");

  for (const task of dueSoonTasks) {
    try {
      await sendDeadlineReminder(task);
      task.reminders = {
        ...task.reminders,
        dueSoonSentAt: new Date(),
      };
      await task.save();
    } catch (error) {
      console.error("Failed to send due-soon reminder", { taskId: String(task._id), error });
    }
  }
}

export function startTaskReminderScheduler() {
  runTaskReminderJob().catch((error) => {
    console.error("Initial task reminder job failed", error);
  });

  return setInterval(() => {
    runTaskReminderJob().catch((error) => {
      console.error("Scheduled task reminder job failed", error);
    });
  }, TWELVE_HOURS_IN_MS);
}
