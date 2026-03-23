import mongoose from "mongoose";
import Task from "../models/Task.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";

function serializeTask(taskDoc) {
  const task = taskDoc?.toObject ? taskDoc.toObject({ virtuals: false }) : taskDoc;
  return {
    id: String(task._id),
    title: task.title,
    description: task.description,
    deadline: task.deadline,
    status: task.status,
    assignedTo: task.assignedTo?._id ? String(task.assignedTo._id) : String(task.assignedTo),
    assignedUser: task.assignedTo?._id
      ? {
          id: String(task.assignedTo._id),
          name: task.assignedTo.name,
          email: task.assignedTo.email,
          role: task.assignedTo.role,
        }
      : undefined,
    submission: task.submission,
    createdBy: task.createdBy?._id
      ? {
          id: String(task.createdBy._id),
          name: task.createdBy.name,
          email: task.createdBy.email,
          role: task.createdBy.role,
        }
      : String(task.createdBy),
    reminders: task.reminders,
    review: task.review
      ? {
          decision: task.review.decision,
          feedback: task.review.feedback,
          reviewedAt: task.review.reviewedAt,
          reviewedBy: task.review.reviewedBy?._id
            ? {
                id: String(task.review.reviewedBy._id),
                name: task.review.reviewedBy.name,
                email: task.review.reviewedBy.email,
                role: task.review.reviewedBy.role,
              }
            : task.review.reviewedBy
              ? String(task.review.reviewedBy)
              : undefined,
        }
      : undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export async function getTasks(req, res, next) {
  try {
    const filter = req.user.role === "admin" ? {} : { assignedTo: req.user._id };
    const tasks = await Task.find(filter)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("review.reviewedBy", "name email role")
      .sort({ createdAt: -1 });

    return res.json({
      tasks: tasks.map(serializeTask),
    });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req, res, next) {
  try {
    const { title, description, deadline, assignedUser, assignedUserId, assignedTo, status } =
      req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const targetUserId = assignedUserId || assignedUser || assignedTo;
    if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({ message: "A valid assigned user is required" });
    }

    const exists = await User.exists({ _id: targetUserId });
    if (!exists) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim(),
      deadline: deadline ? new Date(deadline) : undefined,
      assignedTo: targetUserId,
      status: status || "Pending",
      createdBy: req.user._id,
    });

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

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
      assignedUser,
      assignedUserId,
      assignedTo,
      status,
      submissionText,
      submissionFileName,
      submissionFileUrl,
      reviewDecision,
      reviewFeedback,
    } = req.body;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const existing = await Task.findById(taskId).populate("createdBy", "name email role");
    if (!existing) {
      return res.status(404).json({ message: "Task not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(existing.assignedTo) === String(req.user._id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "You can only update your assigned tasks" });
    }

    const update = {};
    if (isAdmin) {
      if (typeof title === "string") update.title = title.trim();
      if (typeof description === "string") update.description = description.trim();
      if (deadline !== undefined) update.deadline = deadline ? new Date(deadline) : null;
      if (typeof status === "string") update.status = status;
      if (reviewDecision === "Approved" || reviewDecision === "Rejected") {
        update.review = {
          decision: reviewDecision,
          feedback: reviewFeedback ? String(reviewFeedback).trim() : "",
          reviewedAt: new Date(),
          reviewedBy: req.user._id,
        };
        update.status = reviewDecision === "Approved" ? "Completed" : "Rejected";
      }
    } else {
      // Users can update only their status + submission info.
      if (typeof status === "string") update.status = status;
      if (
        submissionText !== undefined ||
        submissionFileName !== undefined ||
        submissionFileUrl !== undefined
      ) {
        update.submission = {
          text: submissionText ? String(submissionText).trim() : undefined,
          fileName: submissionFileName ? String(submissionFileName).trim() : undefined,
          fileUrl: submissionFileUrl ? String(submissionFileUrl).trim() : undefined,
          submittedAt: new Date(),
        };
        update.status = "Pending Review";
      }
    }

    const targetUserId = assignedUserId || assignedUser || assignedTo;
    if (isAdmin && targetUserId !== undefined) {
      if (!mongoose.isValidObjectId(targetUserId)) {
        return res.status(400).json({ message: "Invalid assigned user id" });
      }
      const exists = await User.exists({ _id: targetUserId });
      if (!exists) {
        return res.status(404).json({ message: "Assigned user not found" });
      }
      update.assignedTo = targetUserId;
    }

    const task = await Task.findByIdAndUpdate(taskId, update, { returnDocument: 'after' })
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("review.reviewedBy", "name email role")
      .exec();

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const submissionSaved =
      !isAdmin &&
      (submissionText !== undefined || submissionFileName !== undefined || submissionFileUrl !== undefined);

    if (submissionSaved && existing.createdBy?.email) {
      try {
        await sendEmail({
          to: existing.createdBy.email,
          subject: `DTMS Submission: "${task.title}" has been updated`,
          text: `${req.user.name} submitted work for "${task.title}".`,
          html: `
            <div style="font-family: Inter, Arial, sans-serif; color: #0f172a;">
              <h2 style="margin-bottom: 12px;">Task submission received</h2>
              <p><strong>${req.user.name}</strong> submitted work for <strong>${task.title}</strong>.</p>
              <p>Status: <strong>${task.status}</strong></p>
            </div>
          `,
        });

        task.reminders = {
          ...task.reminders,
          submissionSentAt: new Date(),
        };
        await task.save();
      } catch (emailError) {
        console.error("Submission email failed", emailError);
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

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ message: "Invalid task id" });
    }

    const deleted = await Task.findByIdAndDelete(taskId);
    if (!deleted) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json({ message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
}
