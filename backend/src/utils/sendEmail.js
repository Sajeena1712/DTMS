import transporter from "../config/mailer.js";

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

export async function sendEmail({ to, subject, html, text }) {
  const senderUser = process.env.MAIL_USER || process.env.EMAIL_USER;
  const senderFrom = process.env.MAIL_FROM || process.env.EMAIL_FROM || senderUser || "DTMS <noreply@dtms.local>";

  if (!senderUser) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email sender is not configured. Set MAIL_USER or EMAIL_USER in production.");
    }

    console.log("Email preview");
    console.log({ to, subject, text });
    return;
  }

  try {
    const replyTo = senderFrom && senderFrom !== senderUser ? senderFrom : undefined;
    const info = await withTimeout(
      transporter.sendMail({
        from: senderUser,
        replyTo,
        to,
        subject,
        html,
        text,
      }),
      Number(process.env.EMAIL_TIMEOUT_MS || 15000),
      "Email sending timed out"
    );
    console.log("Email sent", { to, messageId: info.messageId, from: senderUser, replyTo: replyTo || null });
  } catch (error) {
    console.error("Email delivery failed", error);
    throw error;
  }
}
