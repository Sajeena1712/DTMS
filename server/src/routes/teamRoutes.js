import { Router } from "express";
import {
  createTeam,
  deleteTeam,
  getAdminSummary,
  getTeamMembers,
  listTeams,
  updateTeam,
  updateTeamMember,
} from "../controllers/teamController.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", requireAuth, requireAdmin, listTeams);
router.get("/summary", requireAuth, requireAdmin, getAdminSummary);
router.post("/", requireAuth, requireAdmin, createTeam);
router.put("/:teamId", requireAuth, requireAdmin, updateTeam);
router.delete("/:teamId", requireAuth, requireAdmin, deleteTeam);
router.get("/:teamId/members", requireAuth, requireAdmin, getTeamMembers);
router.patch("/:teamId/members/:userId", requireAuth, requireAdmin, updateTeamMember);

export default router;
