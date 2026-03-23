import transporter from "../config/mailer.js";

async function sendWithResend({ to, subject, html, text, from }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log("Email sent", { to, messageId: data.id });
}

export async function sendEmail({ to, subject, html, text }) {
  const senderUser = process.env.MAIL_USER || process.env.EMAIL_USER;
  const senderFrom =
    process.env.RESEND_FROM ||
    process.env.MAIL_FROM ||
    process.env.EMAIL_FROM ||
    senderUser ||
    "DTMS <onboarding@resend.dev>";
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (resendApiKey) {
    try {
      await sendWithResend({
        to,
        subject,
        html,
        text,
        from: senderFrom,
      });
      return;
    } catch (error) {
      console.error("Resend delivery failed", error);
      throw error;
    }
  }

  if (!senderUser) {
    console.log("Email preview");
    console.log({ to, subject, text });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: senderFrom,
      to,
      subject,
      html,
      text,
    });
    console.log("Email sent", { to, messageId: info.messageId });
  } catch (error) {
    console.error("Email delivery failed", error);
    throw error;
  }
}
