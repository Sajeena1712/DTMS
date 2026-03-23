import dotenv from "dotenv";
import app from "./app.js";
import connectDatabase from "./config/db.js";
import { startTaskReminderScheduler } from "./jobs/taskReminderJob.js";
import ensureAdminUser from "./lib/ensureAdminUser.js";

dotenv.config({ override: true });

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();
    const admin = await ensureAdminUser();
    console.log(`Admin account ready in Prisma: ${admin.email}`);
    startTaskReminderScheduler();
    const server = app.listen(port, () => {
      console.log(`DTMS server running on http://localhost:${port}`);
    });

    server.on("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        console.error(
          `Port ${port} is already in use. Stop the existing process or set PORT to a free port, then rerun the server.`,
        );
      } else {
        console.error("Failed to start DTMS server", error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start DTMS server", error);
    process.exit(1);
  }
}

startServer();
