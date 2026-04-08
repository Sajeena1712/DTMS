import { Router } from "express";
import {
  addTaskComment,
  deleteTaskComment,
  createTask,
  deleteTask,
  getTaskDiscussion,
  getTasks,
  updateTask,
  updateTaskComment,
} from "../controllers/taskController.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, getTasks);
router.get("/:taskId/comments", requireAuth, getTaskDiscussion);
router.post("/:taskId/comments", requireAuth, addTaskComment);
router.put("/:taskId/comments/:commentId", requireAuth, updateTaskComment);
router.delete("/:taskId/comments/:commentId", requireAuth, deleteTaskComment);
router.post("/", requireAuth, requireAdmin, createTask);
router.put("/:taskId", requireAuth, updateTask);
router.delete("/:taskId", requireAuth, requireAdmin, deleteTask);

export default router;
