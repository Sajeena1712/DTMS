import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import { buildCalendarPanel, buildPremiumEmail } from "../utils/emailTemplates.js";

function normalizeRole(role) {
  return typeof role === "string" ? role.toUpperCase() : role;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
}

export const buildPublicUser = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    isVerified: Boolean(user.emailVerified),
  };
};

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

function buildClientRoute(req, path) {
  const appUrl = buildAppUrl(req).replace(/\/$/, "");
  return `${appUrl}/#${path}`;
}

function buildEmailLayout({ eyebrow, title, intro, actionLabel, actionUrl, footerNote }) {
  return `
    <div style="margin:0;background-color:#f8fafc;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;">
        <tr>
          <td>
            <div style="border-radius:28px;background:linear-gradient(135deg,#dbeafe 0%,#eff6ff 45%,#ffffff 100%);padding:28px 32px;box-shadow:0 18px 60px rgba(37,99,235,0.10);">
              <div style="display:inline-block;border-radius:999px;background:#ffffff;padding:8px 14px;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#2563eb;">
                ${eyebrow}
              </div>
              <h1 style="margin:18px 0 10px;font-size:30px;line-height:1.2;font-weight:700;color:#0f172a;">
                ${title}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#475569;">
                ${intro}
              </p>
              <a href="${actionUrl}" style="display:inline-block;border-radius:16px;background:linear-gradient(90deg,#2563eb 0%,#7c3aed 100%);padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;box-shadow:0 14px 32px rgba(37,99,235,0.22);">
                ${actionLabel}
              </a>
              <div style="margin-top:24px;border-radius:20px;background:#ffffff;padding:18px 20px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">
                  Direct link
                </p>
                <p style="margin:0;font-size:13px;line-height:1.7;word-break:break-all;color:#2563eb;">
                  ${actionUrl}
                </p>
              </div>
            </div>
            <p style="margin:18px 10px 0;font-size:12px;line-height:1.7;color:#64748b;text-align:center;">
              ${footerNote}
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function sendVerificationEmail(req, user, verificationToken) {
  const verifyLink = buildClientRoute(req, `/verify-email/${verificationToken}`);

  if (process.env.NODE_ENV !== "production") {
    console.log("Verification link (dev):", verifyLink);
  }

  await sendEmail({
    to: user.email,
    subject: "Confirm your DTMS account",
    text: [
      `Hello ${user.name || "there"},`,
      "",
      "Please confirm your email address to activate your DTMS account.",
      "",
      `Confirm your email: ${verifyLink}`,
      "",
      "This link expires in 24 hours.",
      "If you did not create this account, ignore this message.",
    ].join("\n"),
    html: buildPremiumEmail({
      eyebrow: "DTMS Access",
      title: "Confirm your email",
      intro: `Hello ${user.name || "there"},<br /><br />Confirm your email address to activate your DTMS account and begin using your workspace.`,
      actionLabel: "Confirm Now",
      actionUrl: verifyLink,
      footerNote: "This verification link expires in 24 hours. If you did not create this account, you can ignore this message.",
      accent: "#2563eb",
      accentSoft: "#dbeafe",
      badgeTone: "#2563eb",
      details: [
        { label: "Account", value: user.email },
        { label: "Security", value: "Verification required" },
      ],
    }),
  });

  return verifyLink;
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

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(409).json({ message: "Email is already registered" });
      }

      const verificationToken = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          emailVerificationTokenHash: sha256(verificationToken),
          emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      await sendVerificationEmail(req, existingUser, verificationToken);

      return res.status(200).json({
        message: "Your verification email has been resent. Please check your inbox and spam folder.",
        user: buildPublicUser(existingUser),
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = sha256(verificationToken);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: passwordHash,
        role: "USER",
        emailVerified: false,
        emailVerificationTokenHash: verificationTokenHash,
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(req, user, verificationToken);

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

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(404).json({ message: "Please create an account to continue" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: "Please verify your email before signing in" });
    }

    const token = generateToken(user.id);
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
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
      },
    });

    return res.status(200).json({ message: "Email verified successfully. You can sign in now." });
  } catch (error) {
    next(error);
  }
}

export async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(200).json({ message: "If the account exists, a verification email has been sent." });
    }

    if (user.emailVerified) {
      return res.status(200).json({ message: "Your email is already verified. You can sign in now." });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationTokenHash: sha256(verificationToken),
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await sendVerificationEmail(req, user, verificationToken);

    return res.status(200).json({
      message: "A new verification email has been sent. Please check your inbox and spam folder.",
    });
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

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      return res.status(200).json({ message: "If the email exists, a reset link has been sent." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: sha256(resetToken),
        passwordResetExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const resetLink = buildClientRoute(req, `/reset-password/${resetToken}`);
    if (process.env.NODE_ENV !== "production") {
      console.log("Reset link (dev):", resetLink);
    }
    await sendEmail({
      to: user.email,
      subject: "Reset your DTMS password",
      text: [
        `Hello ${user.name || "there"},`,
        "",
        "We received a request to reset your DTMS password.",
        "Use the secure link below to create a new password.",
        "",
        `Reset your password: ${resetLink}`,
        "",
        "This link expires in 30 minutes.",
        "If you did not request this change, ignore this message.",
      ].join("\n"),
      html: buildPremiumEmail({
        eyebrow: "DTMS Security",
        title: "Reset your password",
        intro: `Hello ${user.name || "there"},<br /><br />We received a request to reset your DTMS password. Use the secure link below to create a new password.`,
        actionLabel: "Create Password",
        actionUrl: resetLink,
        footerNote: "This reset link expires in 30 minutes. If you did not request this change, you can ignore this message.",
        accent: "#7c3aed",
        accentSoft: "#ede9fe",
        badgeTone: "#7c3aed",
        details: [
          { label: "Account", value: user.email },
          { label: "Security", value: "Reset requested" },
        ],
        extraHtml: buildCalendarPanel({
          label: "Expiry window",
          title: "30 minutes",
          date: "Link remains active briefly",
          caption: "For your security, the link becomes invalid after 30 minutes.",
        }),
      }),
    });

    return res.status(200).json({ message: "If the email exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const token = req.params.token || req.body?.token;
    const { password, confirmPassword } = req.body;

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
    const user = await prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 12),
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });

    return res.status(200).json({ message: "Password reset successful. You can sign in now." });
  } catch (error) {
    next(error);
  }
}
