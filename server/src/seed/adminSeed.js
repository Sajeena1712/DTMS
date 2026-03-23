import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import connectDatabase from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

async function seedAdmin() {
  await connectDatabase();

  const adminEmail = process.env.ADMIN_EMAIL || "admin@dtms.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    existingAdmin.name = "DTMS Admin";
    existingAdmin.password = passwordHash;
    existingAdmin.role = "admin";
    existingAdmin.isVerified = true;
    await existingAdmin.save();
    console.log(`Admin account updated: ${adminEmail}`);
    process.exit(0);
  }

  await User.create({
    name: "DTMS Admin",
    email: adminEmail,
    password: passwordHash,
    role: "admin",
    isVerified: true,
  });

  console.log(`Admin account created: ${adminEmail}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error("Failed to seed admin account", error);
  process.exit(1);
});
