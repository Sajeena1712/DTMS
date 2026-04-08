import prisma from "../lib/prisma.js";

function normalizeRole(role) {
  const normalized = String(role || "USER").trim().toUpperCase();
  return normalized === "TEAM_LEADER" ? "TEAM_LEADER" : "USER";
}

async function serializeTeam(team) {
  return {
    id: team.id,
    name: team.name,
    description: team.description || "",
    leaderId: team.leaderId || null,
    leaderName: team.leaderName || null,
    leaderEmail: team.leaderEmail || null,
    memberCount: team._count?.members ?? team.members?.length ?? 0,
    taskCount: team._count?.tasks ?? team.tasks?.length ?? 0,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
}

async function attachLeaderDetails(team) {
  if (!team?.leaderId) {
    return {
      ...team,
      leaderName: null,
      leaderEmail: null,
    };
  }

  const leader = await prisma.user.findUnique({
    where: { id: team.leaderId },
    select: { id: true, name: true, email: true },
  });

  return {
    ...team,
    leaderName: leader?.name || null,
    leaderEmail: leader?.email || null,
  };
}

async function findTeamById(teamId) {
  if (!teamId) {
    return null;
  }

  return prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          teamId: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { members: true, tasks: true },
      },
    },
  });
}

export async function listTeams(req, res, next) {
  try {
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: { members: true, tasks: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const leaderIds = [...new Set(teams.map((team) => team.leaderId).filter(Boolean))];
    const leaders = leaderIds.length
      ? await prisma.user.findMany({
          where: { id: { in: leaderIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const leaderMap = new Map(leaders.map((leader) => [leader.id, leader]));

    return res.status(200).json({
      teams: await Promise.all(
        teams.map(async (team) => {
          const leader = team.leaderId ? leaderMap.get(team.leaderId) : null;
          return serializeTeam({
            ...team,
            leaderName: leader?.name || null,
            leaderEmail: leader?.email || null,
          });
        }),
      ),
    });
  } catch (error) {
    next(error);
  }
}

export async function createTeam(req, res, next) {
  try {
    const { name, description, leaderId } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Team name is required" });
    }

    const existing = await prisma.team.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });
    if (existing) {
      return res.status(409).json({ message: "Team already exists" });
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        leaderId: null,
      },
    });

    if (leaderId) {
      const leader = await prisma.user.findUnique({ where: { id: leaderId } });
      if (leader && leader.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: leaderId },
          data: {
            teamId: team.id,
            role: normalizeRole(leader.role) === "TEAM_LEADER" ? leader.role : "TEAM_LEADER",
          },
        });
        await prisma.team.update({
          where: { id: team.id },
          data: { leaderId },
        });
      }
    }

    const hydratedTeam = await attachLeaderDetails(await findTeamById(team.id));
    return res.status(201).json({
      message: "Team created successfully",
      team: hydratedTeam ? await serializeTeam(hydratedTeam) : { id: team.id, name: team.name },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTeam(req, res, next) {
  try {
    const { teamId } = req.params;
    const { name, description, leaderId } = req.body;

    const existing = await prisma.team.findUnique({ where: { id: teamId } });
    if (!existing) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (name && String(name).trim() !== existing.name) {
      const duplicate = await prisma.team.findFirst({
        where: { name: { equals: String(name).trim(), mode: "insensitive" }, id: { not: teamId } },
      });
      if (duplicate) {
        return res.status(409).json({ message: "Team already exists" });
      }
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? description.trim() : existing.description,
        leaderId: leaderId !== undefined ? null : existing.leaderId,
      },
    });

    if (leaderId) {
      const leader = await prisma.user.findUnique({ where: { id: leaderId } });
      if (leader && leader.role !== "ADMIN") {
        await prisma.user.update({
          where: { id: leaderId },
          data: {
            teamId,
            role: normalizeRole(leader.role) === "TEAM_LEADER" ? leader.role : "TEAM_LEADER",
          },
        });
        await prisma.team.update({
          where: { id: teamId },
          data: { leaderId },
        });
      }
    }

    const hydratedTeam = await attachLeaderDetails(await findTeamById(updatedTeam.id));
    return res.status(200).json({
      message: "Team updated successfully",
      team: hydratedTeam ? await serializeTeam(hydratedTeam) : { id: updatedTeam.id, name: updatedTeam.name },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTeam(req, res, next) {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      return res.status(400).json({ message: "Invalid team id" });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    await prisma.user.updateMany({
      where: { teamId },
      data: { teamId: null },
    });

    await prisma.task.updateMany({
      where: { teamId },
      data: { teamId: null },
    });

    await prisma.team.delete({ where: { id: teamId } });

    return res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    next(error);
  }
}

export async function getTeamMembers(req, res, next) {
  try {
    const { teamId } = req.params;
    const team = await attachLeaderDetails(await findTeamById(teamId));

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const taskCounts = await prisma.task.findMany({
      where: { teamId },
      select: { userId: true, status: true },
    });

    const countMap = taskCounts.reduce((acc, task) => {
      const key = task.userId;
      if (!acc[key]) {
        acc[key] = { totalTasks: 0, completedTasks: 0 };
      }
      acc[key].totalTasks += 1;
      if (task.status === "COMPLETED") {
        acc[key].completedTasks += 1;
      }
      return acc;
    }, {});

    const members = team.members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      teamId: member.teamId || null,
      teamName: team.name,
      isVerified: member.emailVerified,
      createdAt: member.createdAt,
      totalTasks: countMap[member.id]?.totalTasks ?? 0,
      completedTasks: countMap[member.id]?.completedTasks ?? 0,
    }));

    if (team.leaderId && !members.some((member) => member.id === team.leaderId)) {
      const leader = await prisma.user.findUnique({
        where: { id: team.leaderId },
        select: { id: true, name: true, email: true, role: true, teamId: true },
      });

      if (leader) {
      members.unshift({
          id: leader.id,
          name: leader.name,
          email: leader.email,
          role: leader.role,
          teamId: leader.teamId || teamId,
          teamName: team.name,
          isVerified: true,
          createdAt: new Date(),
          totalTasks: countMap[leader.id]?.totalTasks ?? 0,
          completedTasks: countMap[leader.id]?.completedTasks ?? 0,
        });
      }
    }

    return res.status(200).json({
      team: await serializeTeam(team),
      members,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTeamMember(req, res, next) {
  try {
    const { teamId, userId } = req.params;
    const { removeFromTeam } = req.body;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        teamId: removeFromTeam ? null : teamId,
        role: user.role === "TEAM_LEADER" || removeFromTeam ? user.role : "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        team: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({
      message: removeFromTeam ? "User removed from team" : "User moved to team",
      user: {
        ...updatedUser,
        teamName: updatedUser.team?.name || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminSummary(req, res, next) {
  try {
    const [teams, totalUsers, totalTasks, tasksCompleted, tasksPending] = await Promise.all([
      prisma.team.findMany({
        include: {
          _count: { select: { members: true, tasks: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.count({ where: { role: { in: ["USER", "TEAM_LEADER"] } } }),
      prisma.task.count({}),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.task.count({ where: { status: { in: ["PENDING", "IN_PROGRESS", "PENDING_REVIEW", "REJECTED"] } } }),
    ]);

    const teamPerformance = await Promise.all(
      teams.map(async (team) => {
        const [members, completedTasks, totalTasksForTeam] = await Promise.all([
          prisma.user.count({ where: { teamId: team.id } }),
          prisma.task.count({ where: { teamId: team.id, status: "COMPLETED" } }),
          prisma.task.count({ where: { teamId: team.id } }),
        ]);

        return {
          id: team.id,
          name: team.name,
          memberCount: members,
          completedTasks,
          totalTasks: totalTasksForTeam,
          activeMembers: members,
        };
      }),
    );

    return res.status(200).json({
      stats: {
        totalTeams: teams.length,
        totalUsers,
        totalTasks,
        tasksCompleted,
        tasksPending,
      },
      teams: await Promise.all(
        teams.map(async (team) => {
          const leader = team.leaderId
            ? await prisma.user.findUnique({
                where: { id: team.leaderId },
                select: { id: true, name: true, email: true },
              })
            : null;

          return {
            id: team.id,
            name: team.name,
            description: team.description || "",
            leaderName: leader?.name || null,
            memberCount: team._count?.members ?? 0,
            taskCount: team._count?.tasks ?? 0,
          };
        }),
      ),
      teamPerformance,
    });
  } catch (error) {
    next(error);
  }
}
