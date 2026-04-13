import dotenv from "dotenv";
import connectDatabase from "../config/db.js";
import ensureAdminUser from "../lib/ensureAdminUser.js";

dotenv.config({ override: true });

async function seedAdmin() {
  await connectDatabase();
  const admin = await ensureAdminUser();
  console.log(`Admin account ready in Prisma: ${admin.email}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error("Failed to seed admin account", error);
  process.exit(1);
});
