import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

function buildPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: Boolean(user.isVerified),
  };
}

function setAuthCookie(res, token) {
  res.cookie("dtms_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildAppUrl(req) {
  const fallback = process.env.CLIENT_URL || "http://localhost:5173";
  const origin = req.headers.origin;
  return origin && origin.startsWith("http") ? origin : fallback;
}

export async function register(req, res, next) {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, number, and special character",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = sha256(verificationToken);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password: passwordHash,
      role: "user",
      isVerified: false,
      emailVerificationTokenHash: verificationTokenHash,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const appUrl = buildAppUrl(req);
    const verifyLink = `${appUrl}/verify-email/${verificationToken}`;
    if (process.env.NODE_ENV !== "production") {
      console.log("Verification link (dev):", verifyLink);
    }
    await sendEmail({
      to: user.email,
      subject: "Verify your DTMS account",
      text: `Verify your email to activate your DTMS account: ${verifyLink}`,
      html: `<p>Verify your email to activate your DTMS account.</p><p><a href="${verifyLink}">Verify email</a></p>`,
    });

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
      user: buildPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!validateEmail(email) || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "Please create an account to continue" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before signing in" });
    }

    const token = generateToken(user._id.toString());
    setAuthCookie(res, token);

    res.status(200).json({
      message: "Login successful",
      token,
      user: buildPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res) {
  res.status(200).json({
    user: buildPublicUser(req.user),
  });
}

export async function logout(req, res) {
  res.clearCookie("dtms_token");
  res.status(200).json({ message: "Logged out successfully" });
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const tokenHash = sha256(token);
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    user.isVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: "Email verified successfully. You can sign in now." });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return success to prevent account enumeration.
    if (!user) {
      return res.status(200).json({ message: "If the email exists, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = sha256(resetToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const appUrl = buildAppUrl(req);
    const resetLink = `${appUrl}/reset-password/${resetToken}`;
    if (process.env.NODE_ENV !== "production") {
      console.log("Reset link (dev):", resetLink);
    }
    await sendEmail({
      to: user.email,
      subject: "Reset your DTMS password",
      text: `Reset your DTMS password: ${resetLink}`,
      html: `<p>Reset your DTMS password.</p><p><a href="${resetLink}">Reset password</a></p>`,
    });

    return res.status(200).json({ message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include uppercase, number, and special character",
      });
    }

    const tokenHash = sha256(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful. You can sign in now." });
  } catch (error) {
    next(error);
  }
}
