import dotenv from "dotenv";
import app from "./app.js";
import connectDatabase from "./config/db.js";
import { startTaskReminderScheduler } from "./jobs/taskReminderJob.js";
import ensureAdminUser from "./lib/ensureAdminUser.js";

dotenv.config({ override: true });

const configuredPort = process.env.PORT || 3000;
const devFallbackPort = 3001;
const resolvedPort =
  process.env.NODE_ENV === "production"
    ? configuredPort
    : String(configuredPort) === "3000"
      ? devFallbackPort
      : configuredPort;

if (process.env.NODE_ENV !== "production") {
  process.on("beforeExit", (code) => {
    console.log(`DTMS server beforeExit with code ${code}`);
  });
  process.on("exit", (code) => {
    console.log(`DTMS server exit with code ${code}`);
  });
  process.on("SIGINT", () => {
    console.log("DTMS server received SIGINT");
  });
  process.on("SIGTERM", () => {
    console.log("DTMS server received SIGTERM");
  });
  process.on("uncaughtException", (error) => {
    console.error("DTMS server uncaughtException", error);
  });
  process.on("unhandledRejection", (error) => {
    console.error("DTMS server unhandledRejection", error);
  });
}

async function startServer() {
  try {
    await connectDatabase();
    const admin = await ensureAdminUser();
    console.log(`Admin account ready in Prisma: ${admin.email}`);
    startTaskReminderScheduler();
    const server = app.listen(resolvedPort, () => {
      console.log(`DTMS server running on http://localhost:${resolvedPort}`);
    });

    server.on("error", (error) => {
      if (error?.code === "EADDRINUSE") {
        console.error(
          `Port ${resolvedPort} is already in use. Stop the existing process or set PORT to a free port, then rerun the server.`,
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
