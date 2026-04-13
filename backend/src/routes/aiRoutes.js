import { Router } from "express";
import {
  generateTaskDescription,
  evaluateSubmission,
  getAiSettings,
  updateAiSettings,
} from "../controllers/aiController.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/task-description", requireAuth, requireAdmin, generateTaskDescription);
router.post("/evaluate-submission", requireAuth, requireAdmin, evaluateSubmission);
router.get("/settings", requireAuth, requireAdmin, getAiSettings);
router.put("/settings", requireAuth, requireAdmin, updateAiSettings);

export default router;
