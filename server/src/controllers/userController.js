import prisma from "../lib/prisma.js";

export async function getDashboard(req, res) {
  const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };

  const [totalTasks, completedTasks, pendingTasks, inProgressTasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.task.count({ where: { ...where, status: "PENDING" } }),
    prisma.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
  ]);

  res.status(200).json({
    user: {
      id: req.user.id,
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
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.emailVerified,
      createdAt: user.createdAt,
    })),
  });
}
