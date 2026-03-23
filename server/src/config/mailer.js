import "dotenv/config";
import nodemailer from "nodemailer";

const emailUser = process.env.MAIL_USER || process.env.EMAIL_USER;
const emailPassRaw = process.env.MAIL_PASS || process.env.EMAIL_PASSWORD || "";
const emailPass = emailPassRaw.replace(/\s+/g, "");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.MAIL_PORT || process.env.EMAIL_PORT || 587),
  secure: String(process.env.MAIL_SECURE || process.env.EMAIL_SECURE).toLowerCase() === "true",
  auth: emailUser
    ? {
        user: emailUser,
        pass: emailPass,
      }
    : undefined,
});

export default transporter;
