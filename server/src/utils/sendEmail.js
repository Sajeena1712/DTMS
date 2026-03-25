import transporter from "../config/mailer.js";

export async function sendEmail({ to, subject, html, text }) {
  const senderUser = process.env.MAIL_USER || process.env.EMAIL_USER;
  const senderFrom = process.env.MAIL_FROM || process.env.EMAIL_FROM || senderUser || "DTMS <noreply@dtms.local>";

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
