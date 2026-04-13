import { Router } from "express";
import {
  bulkCreateUsers,
  createAdminUser,
  getDashboard,
  getLeaderboard,
  listUsers,
  updateProfile,
  updateUserTeam,
} from "../controllers/userController.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/dashboard", requireAuth, getDashboard);
router.get("/leaderboard", requireAuth, getLeaderboard);
router.put("/profile", requireAuth, updateProfile);
router.get("/", requireAuth, requireAdmin, listUsers);
router.post("/admin/users", requireAuth, requireAdmin, createAdminUser);
router.post("/admin/users/bulk", requireAuth, requireAdmin, bulkCreateUsers);
router.patch("/admin/users/:userId/team", requireAuth, requireAdmin, updateUserTeam);

export default router;
