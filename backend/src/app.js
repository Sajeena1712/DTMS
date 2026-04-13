import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

dotenv.config({ override: true });

const app = express();
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirectory = path.resolve(__dirname, "../uploads");
const vercelOriginPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

function resolveCorsOrigin(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (origin === clientUrl) {
    callback(null, true);
    return;
  }

  // Allow Vercel preview and production deployments.
  if (vercelOriginPattern.test(origin)) {
    callback(null, true);
    return;
  }

  // Allow local frontend dev servers (Vite may auto-switch ports).
  if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/i.test(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked for origin: ${origin}`));
}

app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDirectory));

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Digital Talent Management System API",
    version: "2.0.0",
    endpoints: [
      "POST /api/auth/register",
      "POST /api/auth/login",
      "POST /api/auth/forgot-password",
      "POST /api/auth/reset-password",
      "POST /api/auth/reset-password/:token",
      "GET /api/auth/verify-email/:token",
      "GET /api/auth/me",
      "POST /api/ai/task-description",
      "GET /api/ai/settings",
      "PUT /api/ai/settings",
      "GET /api/tasks",
      "POST /api/tasks",
      "PUT /api/tasks/:taskId",
      "DELETE /api/tasks/:taskId",
      "GET /api/teams",
      "POST /api/teams",
      "GET /api/user/dashboard",
      "PUT /api/user/profile",
    ],
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ message: "DTMS Backend is running successfully" });
});

app.use("/api/auth", authRoutes);
app.use("/api", authRoutes); // keeps legacy /api/login working
app.use("/api/ai", aiRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/user", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
