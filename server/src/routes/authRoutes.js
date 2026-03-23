import { Router } from "express";
import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  register,
  resetPassword,
  verifyEmail,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);

export default router;
