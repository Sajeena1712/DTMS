import { Router } from "express";
import {
  addTaskComment,
  deleteTaskComment,
  createTask,
  deleteTask,
  getTaskDiscussion,
  getTasks,
  updateTask,
  submitTaskScreeningRound,
  submitTaskInterviewRound,
  submitTaskFinalSelection,
  updateTaskComment,
} from "../controllers/taskController.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, getTasks);
router.get("/:taskId/comments", requireAuth, getTaskDiscussion);
router.post("/:taskId/comments", requireAuth, addTaskComment);
router.put("/:taskId/comments/:commentId", requireAuth, updateTaskComment);
router.delete("/:taskId/comments/:commentId", requireAuth, deleteTaskComment);
router.post("/:taskId/screening", requireAuth, submitTaskScreeningRound);
router.post("/:taskId/interview", requireAuth, submitTaskInterviewRound);
router.post("/:taskId/final-selection", requireAuth, submitTaskFinalSelection);
router.post("/", requireAuth, requireAdmin, createTask);
router.put("/:taskId", requireAuth, updateTask);
router.delete("/:taskId", requireAuth, requireAdmin, deleteTask);

export default router;
