import dotenv from "dotenv";
import app from "./app.js";
import connectDatabase from "./config/db.js";
import { startTaskReminderScheduler } from "./jobs/taskReminderJob.js";

dotenv.config();

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDatabase();
    startTaskReminderScheduler();
    app.listen(port, () => {
      console.log(`DTMS server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start DTMS server", error);
    process.exit(1);
  }
}

startServer();
