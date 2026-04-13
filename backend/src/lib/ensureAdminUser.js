import bcrypt from "bcryptjs";
import prisma from "./prisma.js";

export default async function ensureAdminUser() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@dtms.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const adminData = {
    name: "DTMS Admin",
    password: passwordHash,
    role: "ADMIN",
    emailVerified: true,
  };

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  const admin = existingAdmin
    ? await prisma.user.update({
        where: { email: adminEmail },
        data: adminData,
        select: {
          id: true,
          email: true,
        },
      })
    : await prisma.user.create({
        data: {
          ...adminData,
          email: adminEmail,
        },
        select: {
          id: true,
          email: true,
        },
      });

  return admin;
}
