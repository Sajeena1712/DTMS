import Task from "../models/Task.js";
import User from "../models/User.js";

export async function getDashboard(req, res) {
  const filter = req.user.role === "admin" ? {} : { assignedTo: req.user._id };

  const [totalTasks, completedTasks, pendingTasks, inProgressTasks] = await Promise.all([
    Task.countDocuments(filter),
    Task.countDocuments({ ...filter, status: "Completed" }),
    Task.countDocuments({ ...filter, status: "Pending" }),
    Task.countDocuments({ ...filter, status: "In Progress" }),
  ]);

  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
    stats: {
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
    },
  });
}

export async function listUsers(req, res) {
  const users = await User.find({ role: "user" })
    .select("_id name email role isVerified createdAt")
    .sort({ createdAt: -1 });

  res.status(200).json({
    users: users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: Boolean(user.isVerified),
      createdAt: user.createdAt,
    })),
  });
}
