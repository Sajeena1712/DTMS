import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { buildPublicUser } from "./authController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, "../../uploads");

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

async function saveProfilePhoto({ fileName, fileData }) {
  const matches = String(fileData || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!matches) {
    throw new Error("Invalid profile photo data");
  }

  const [, mimeType, base64Payload] = matches;
  const extension = mimeType.split("/")[1]?.toLowerCase() || "png";
  const baseName = path.parse(String(fileName || `profile.${extension}`)).name;
  const safeName = baseName.replace(/[^\w.\- ]+/g, "").trim();
  const storedFileName = `${Date.now()}-${crypto.randomUUID()}-${safeName || "profile"}.${extension}`;
  const fileBuffer = Buffer.from(base64Payload, "base64");

  await fs.mkdir(uploadsDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadsDirectory, storedFileName), fileBuffer);

  return `/uploads/${storedFileName}`;
}

async function removeStoredPhoto(photoUrl) {
  if (typeof photoUrl !== "string" || !photoUrl.startsWith("/uploads/")) {
    return;
  }

  const fileName = path.basename(photoUrl);
  await fs.unlink(path.join(uploadsDirectory, fileName)).catch(() => undefined);
}

export async function getDashboard(req, res) {
  const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };

  const [totalTasks, completedTasks, pendingTasks, inProgressTasks, totalTeams, totalUsers] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.task.count({ where: { ...where, status: "PENDING" } }),
    prisma.task.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.team.count({}),
    prisma.user.count({ where: { role: { in: ["USER", "TEAM_LEADER"] } } }),
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
      totalTeams,
      totalUsers,
    },
  });
}

function buildAvatarUrl(profilePhoto) {
  return typeof profilePhoto === "string" && profilePhoto.trim() ? profilePhoto.trim() : null;
}

function defaultProfileFields(name = "") {
  return {
    profilePhoto: null,
    skills: [],
    experience: "",
    education: "",
    certifications: [],
    name: name ? String(name).trim() : "",
  };
}

function normalizeRole(role) {
  const normalized = String(role || "USER").trim().toUpperCase();
  return normalized === "TEAM_LEADER" ? "TEAM_LEADER" : "USER";
}

function parseCsvLines(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((header, index) => {
      row[header] = String(values[index] || "").trim();
    });
    return row;
  });
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function columnNameToIndex(columnName) {
  return String(columnName || "")
    .toUpperCase()
    .split("")
    .reduce((acc, char) => acc * 26 + (char.charCodeAt(0) - 64), 0) - 1;
}

function extractXlsxCellValue(cellXml, sharedStrings) {
  const typeMatch = cellXml.match(/\bt="([^"]+)"/);
  const cellType = typeMatch?.[1] || "";
  const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
  const inlineTextMatches = [...cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXmlEntities(match[1]));

  if (cellType === "s" && valueMatch) {
    const sharedIndex = Number(valueMatch[1]);
    return decodeXmlEntities(sharedStrings[sharedIndex] || "");
  }

  if (cellType === "inlineStr" && inlineTextMatches.length > 0) {
    return inlineTextMatches.join("");
  }

  if (valueMatch) {
    return decodeXmlEntities(valueMatch[1]);
  }

  if (inlineTextMatches.length > 0) {
    return inlineTextMatches.join("");
  }

  return "";
}

async function parseXlsxRowsFromDataUrl(dataUrl) {
  const matches = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid Excel upload data");
  }

  const [, mimeType, encoded] = matches;
  if (!/spreadsheetml|excel/i.test(mimeType)) {
    throw new Error("Unsupported Excel file type");
  }

  const buffer = Buffer.from(encoded, "base64");
  const zip = await JSZip.loadAsync(buffer);
  const sharedStringsFile = zip.file("xl/sharedStrings.xml");
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  const sheetXml = sheetFile ? await sheetFile.async("string") : "";

  if (!sheetXml) {
    return [];
  }

  let sharedStrings = [];
  if (sharedStringsFile) {
    const sharedXml = await sharedStringsFile.async("string");
    sharedStrings = [...sharedXml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map((match) => {
      const textParts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((textMatch) => decodeXmlEntities(textMatch[1]));
      return textParts.join("");
    });
  }

  const rowMatches = [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
  if (!rowMatches.length) {
    return [];
  }

  const rows = rowMatches.map((rowMatch) => {
    const cellMatches = [...rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)];
    const cells = [];

    cellMatches.forEach((cellMatch) => {
      const attributes = cellMatch[1];
      const cellBody = cellMatch[2];
      const refMatch = attributes.match(/\br="([A-Z]+)\d+"/);
      const columnIndex = refMatch ? columnNameToIndex(refMatch[1]) : cells.length;
      const cellXml = `<c${attributes}>${cellBody}</c>`;
      cells[columnIndex] = extractXlsxCellValue(cellXml, sharedStrings);
    });

    return cells;
  });

  const headers = rows[0].map((header) => String(header || "").trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = String(row[index] || "").trim();
    });
    return record;
  });
}

async function findOrCreateTeamByName(teamName) {
  const normalized = String(teamName || "").trim();
  if (!normalized) {
    return null;
  }

  const teams = await prisma.team.findMany({
    select: { id: true, name: true, description: true, leaderId: true },
  });
  const existing = teams.find((team) => team.name.toLowerCase() === normalized.toLowerCase());
  if (existing) {
    return existing;
  }

  return prisma.team.create({
    data: {
      name: normalized,
      description: "",
    },
    select: { id: true, name: true, description: true, leaderId: true },
  });
}

function buildUserSummary(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    teamId: user.teamId || null,
    teamName: user.team?.name || null,
    isVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

function resolveLeaderboardPeriod(value) {
  const normalized = String(value || "all").toLowerCase();
  if (normalized === "weekly" || normalized === "monthly" || normalized === "all") {
    return normalized;
  }

  return "all";
}

function isWithinLeaderboardPeriod(dateValue, period) {
  if (period === "all") {
    return true;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  const cutoff = new Date(now);

  if (period === "weekly") {
    cutoff.setDate(cutoff.getDate() - 7);
  } else if (period === "monthly") {
    cutoff.setMonth(cutoff.getMonth() - 1);
  }

  return date >= cutoff;
}

export async function getLeaderboard(req, res, next) {
  try {
    const period = resolveLeaderboardPeriod(req.query.period);
    const [users, completedTasks, allTasks] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ["USER", "TEAM_LEADER"] } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          profilePhoto: true,
          teamId: true,
          team: { select: { id: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.task.findMany({
        where: { status: "COMPLETED" },
        select: { userId: true, review: true, updatedAt: true, createdAt: true },
      }),
      prisma.task.findMany({
        where: {},
        select: { userId: true },
      }),
    ]);

    const filteredCompletedTasks = completedTasks.filter((task) =>
      isWithinLeaderboardPeriod(task.review?.reviewedAt || task.updatedAt || task.createdAt, period),
    );

    const completedByUserId = filteredCompletedTasks.reduce((acc, task) => {
      acc[task.userId] = (acc[task.userId] ?? 0) + 1;
      return acc;
    }, {});

    const totalByUserId = allTasks.reduce((acc, task) => {
      acc[task.userId] = (acc[task.userId] ?? 0) + 1;
      return acc;
    }, {});

    const leaderboard = users
      .map((user) => {
        const completed = completedByUserId[user.id] ?? 0;
        const total = totalByUserId[user.id] ?? 0;
        return {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          avatar: buildAvatarUrl(user.profilePhoto),
          role: user.role,
          completedTasks: completed,
          totalTasks: total,
          createdAt: user.createdAt,
        };
      })
      .sort((a, b) => {
        if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
        if (b.totalTasks !== a.totalTasks) return b.totalTasks - a.totalTasks;
        return new Date(a.createdAt) - new Date(b.createdAt);
      })
      .map((entry, index, array) => {
        const topCompleted = array[0]?.completedTasks || 0;
        return {
          ...entry,
          rank: index + 1,
          progress: topCompleted > 0 ? Math.round((entry.completedTasks / topCompleted) * 100) : 0,
        };
      });

    const currentUser = leaderboard.find((entry) => entry.id === req.user.id) || null;
    const averageCompleted = leaderboard.length
      ? Math.round(leaderboard.reduce((sum, entry) => sum + entry.completedTasks, 0) / leaderboard.length)
      : 0;
    const teamGroups = new Map();

    users.forEach((user) => {
      const teamKey = user.teamId || "unassigned";
      if (!teamGroups.has(teamKey)) {
        teamGroups.set(teamKey, {
          id: user.teamId || null,
          name: user.team?.name || "Unassigned",
          members: [],
        });
      }

      teamGroups.get(teamKey).members.push(user);
    });

    const teamLeaderboard = Array.from(teamGroups.values())
      .map((team) => {
        const completedTasks = team.members.reduce((sum, member) => sum + (completedByUserId[member.id] ?? 0), 0);
        const totalTasks = team.members.reduce((sum, member) => sum + (totalByUserId[member.id] ?? 0), 0);
        const activeMembers = team.members.filter((member) => (totalByUserId[member.id] ?? 0) > 0).length;
        const completionRate = team.members.length
          ? Math.round((completedTasks / Math.max(1, team.members.length)) * 100)
          : 0;

        return {
          id: team.id || team.name,
          name: team.name,
          memberCount: team.members.length,
          activeMembers,
          completedTasks,
          totalTasks,
          completionRate,
        };
      })
      .sort((a, b) => {
        if (b.completedTasks !== a.completedTasks) return b.completedTasks - a.completedTasks;
        if (b.activeMembers !== a.activeMembers) return b.activeMembers - a.activeMembers;
        return a.name.localeCompare(b.name);
      });

    return res.status(200).json({
      period,
      leaderboard: leaderboard.slice(0, 10),
      teamLeaderboard,
      stats: {
        totalUsers: leaderboard.length,
        averageCompleted,
        topCompleted: leaderboard[0]?.completedTasks || 0,
        currentUser,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    where: { role: { in: ["USER", "TEAM_LEADER"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      teamId: true,
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teamId: user.teamId || null,
      teamName: user.team?.name || null,
      isVerified: user.emailVerified,
      createdAt: user.createdAt,
    })),
  });
}

export async function updateProfile(req, res, next) {
  try {
    const { name, skills, experience, education, certifications, photoFileData, photoFileName, removePhoto } = req.body;
    const email = req.user.email.toLowerCase();
    const currentProfile = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        team: { select: { id: true, name: true } },
        emailVerified: true,
        profilePhoto: true,
        skills: true,
        experience: true,
        education: true,
        certifications: true,
      },
    });

    if (!currentProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const nextProfile = {
      name: typeof name === "string" && name.trim() ? name.trim() : currentProfile.name,
      skills: skills !== undefined ? normalizeList(skills) : normalizeList(currentProfile.skills),
      experience: typeof experience === "string" ? experience.trim() : currentProfile.experience || "",
      education: typeof education === "string" ? education.trim() : currentProfile.education || "",
      certifications:
        certifications !== undefined ? normalizeList(certifications) : normalizeList(currentProfile.certifications),
    };

    if (String(removePhoto).toLowerCase() === "true") {
      await removeStoredPhoto(currentProfile.profilePhoto);
      nextProfile.profilePhoto = null;
    } else if (photoFileData) {
      const nextPhoto = await saveProfilePhoto({ fileName: photoFileName, fileData: photoFileData });
      await removeStoredPhoto(currentProfile.profilePhoto);
      nextProfile.profilePhoto = nextPhoto;
    }

    const updatedProfile = await prisma.user.update({
      where: { email },
      data: {
        ...nextProfile,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teamId: true,
        team: { select: { id: true, name: true } },
        emailVerified: true,
        profilePhoto: true,
        skills: true,
        experience: true,
        education: true,
        certifications: true,
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: buildPublicUser(updatedProfile),
    });
  } catch (error) {
    next(error);
  }
}

export async function createAdminUser(req, res, next) {
  try {
    const { name, email, password, role = "USER", assignedTeamId } = req.body;

    if (!name?.trim() || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    let teamId = assignedTeamId || null;
    if (teamId) {
      const teamCount = await prisma.team.count({ where: { id: teamId } });
      if (!teamCount) {
        return res.status(404).json({ message: "Assigned team not found" });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createdUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash,
        role: normalizeRole(role),
        teamId,
        emailVerified: true,
        ...defaultProfileFields(name.trim()),
      },
    });

    const withTeam = await prisma.user.findUnique({
      where: { id: createdUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        profilePhoto: true,
        skills: true,
        experience: true,
        education: true,
        certifications: true,
        teamId: true,
        team: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({
      message: "User created successfully",
      user: buildUserSummary(withTeam),
    });
  } catch (error) {
    next(error);
  }
}

export async function bulkCreateUsers(req, res, next) {
  try {
    const { csvText, fileData, assignedTeamId } = req.body;
    const rows = fileData ? await parseXlsxRowsFromDataUrl(fileData) : parseCsvLines(csvText);

    if (!rows.length) {
      return res.status(400).json({ message: "CSV or Excel data is required" });
    }

    const created = [];
    const errors = [];
    const defaultTeamId = String(assignedTeamId || "").trim();
    const defaultTeam = defaultTeamId
      ? await prisma.team.findUnique({
          where: { id: defaultTeamId },
          select: { id: true, name: true },
        })
      : null;

    if (defaultTeamId && !defaultTeam) {
      return res.status(404).json({ message: "Assigned team not found" });
    }

    for (const row of rows) {
      const name = String(row.name || "").trim();
      const email = String(row.email || "").trim().toLowerCase();
      const password = String(row.password || "").trim();
      const teamName = String(row.team || "").trim();
      const role = normalizeRole(row.role || "USER");

      if (!name || !email || !password) {
        errors.push({ row, message: "Missing required fields" });
        continue;
      }

      const duplicate = await prisma.user.findUnique({ where: { email } });
      if (duplicate) {
        errors.push({ row, message: "Email already exists" });
        continue;
      }

      const team = teamName
        ? await findOrCreateTeamByName(teamName)
        : defaultTeam;
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: passwordHash,
          role,
          teamId: team?.id || null,
          emailVerified: true,
          ...defaultProfileFields(name),
        },
      });

      created.push({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId || team?.id || null,
        teamName: team?.name || null,
      });
    }

    return res.status(201).json({
      message: "Bulk user upload completed",
      created,
      errors,
      count: created.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUserTeam(req, res, next) {
  try {
    const { userId } = req.params;
    const { teamId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    if (teamId) {
      const teamCount = await prisma.team.count({ where: { id: teamId } });
      if (!teamCount) {
        return res.status(404).json({ message: "Team not found" });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        teamId: teamId || null,
        role: role ? normalizeRole(role) : existing.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        teamId: true,
        team: { select: { id: true, name: true } },
      },
    });

    return res.status(200).json({
      message: "User team updated",
      user: {
        ...updated,
        teamName: updated.team?.name || null,
      },
    });
  } catch (error) {
    next(error);
  }
}
