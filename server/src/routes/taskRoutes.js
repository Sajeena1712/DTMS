import { Router } from "express";
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
} from "../controllers/taskController.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, getTasks);
router.post("/", requireAuth, requireAdmin, createTask);
router.put("/:taskId", requireAuth, updateTask);
router.delete("/:taskId", requireAuth, requireAdmin, deleteTask);

export default router;
