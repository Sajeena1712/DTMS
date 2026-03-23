import Task from "../models/Task.js";
import { sendEmail } from "../utils/sendEmail.js";

const THREE_DAYS_IN_MS = 3 * 24 * 60 * 60 * 1000;
const TWELVE_HOURS_IN_MS = 12 * 60 * 60 * 1000;

async function sendDeadlineReminder(task) {
  if (!task.assignedTo?.email) {
    return;
  }

  await sendEmail({
    to: task.assignedTo.email,
    subject: `DTMS Reminder: "${task.title}" is due soon`,
    text: `Your task "${task.title}" is due on ${new Date(task.deadline).toLocaleDateString()}. Please complete it before the deadline.`,
    html: `
      <div style="font-family: Inter, Arial, sans-serif; color: #0f172a;">
        <h2 style="margin-bottom: 12px;">DTMS deadline reminder</h2>
        <p>Your task <strong>${task.title}</strong> is due on <strong>${new Date(task.deadline).toLocaleDateString()}</strong>.</p>
        <p>Please review the task and submit your work before the deadline.</p>
      </div>
    `,
  });
}

export async function runTaskReminderJob() {
  const now = new Date();
  const upcomingWindow = new Date(now.getTime() + THREE_DAYS_IN_MS);

  const dueSoonTasks = await Task.find({
    deadline: { $gte: now, $lte: upcomingWindow },
    status: { $ne: "Completed" },
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
