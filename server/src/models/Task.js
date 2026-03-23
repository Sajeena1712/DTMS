import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    deadline: {
      type: Date,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
      index: true,
    },
    submission: {
      text: { type: String, trim: true, maxlength: 8000 },
      fileName: { type: String, trim: true, maxlength: 260 },
      fileUrl: { type: String, trim: true, maxlength: 2048 },
      submittedAt: { type: Date },
    },
    reminders: {
      dueSoonSentAt: { type: Date },
      submissionSentAt: { type: Date },
    },
    review: {
      decision: {
        type: String,
        enum: ["Approved", "Rejected"],
      },
      feedback: { type: String, trim: true, maxlength: 2000 },
      reviewedAt: { type: Date },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Task", taskSchema);
