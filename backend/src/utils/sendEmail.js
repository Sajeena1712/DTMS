import transporter from "../config/mailer.js";

function withTimeout(promise, timeoutMs, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

async function sendViaResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const senderFrom = process.env.RESEND_FROM || process.env.MAIL_FROM || process.env.EMAIL_FROM;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  if (!senderFrom) {
    throw new Error("RESEND_FROM is not configured");
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.EMAIL_TIMEOUT_MS || 15000);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderFrom,
        to: [to],
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage =
        payload?.message || payload?.error || `Resend request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return {
      messageId: payload?.id || null,
      provider: "resend",
      from: senderFrom,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendEmail({ to, subject, html, text }) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    try {
      const info = await sendViaResend({ to, subject, html, text });
      console.log("Email sent", {
        to,
        messageId: info.messageId,
        provider: info.provider,
        from: info.from,
      });
      return;
    } catch (error) {
      console.error("Resend delivery failed", error);
      throw error;
    }
  }

  const senderUser = process.env.MAIL_USER || process.env.EMAIL_USER;
  const senderFrom =
    process.env.MAIL_FROM || process.env.EMAIL_FROM || senderUser || "DTMS <noreply@dtms.local>";

  if (!senderUser) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Email sender is not configured. Set RESEND_API_KEY/RESEND_FROM or MAIL_USER/EMAIL_USER in production."
      );
    }

    console.log("Email preview");
    console.log({ to, subject, text });
    return;
  }

  try {
    const replyTo = senderFrom && senderFrom !== senderUser ? senderUser : undefined;
    const info = await withTimeout(
      transporter.sendMail({
        from: senderFrom,
        replyTo,
        to,
        subject,
        html,
        text,
      }),
      Number(process.env.EMAIL_TIMEOUT_MS || 15000),
      "Email sending timed out"
    );
    console.log("Email sent", {
      to,
      messageId: info.messageId,
      from: senderFrom,
      replyTo: replyTo || null,
    });
  } catch (error) {
    console.error("Email delivery failed", error);
    throw error;
  }
}
