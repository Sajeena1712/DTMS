import { Router } from "express";
import { getDashboard, listUsers } from "../controllers/userController.js";
import { requireAdmin, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/dashboard", requireAuth, getDashboard);
router.get("/", requireAuth, requireAdmin, listUsers);

export default router;
