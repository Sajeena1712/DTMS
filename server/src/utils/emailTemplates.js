function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDateLabel(value, locale = "en-US") {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function buildPremiumEmail({
  eyebrow,
  title,
  intro,
  actionLabel,
  actionUrl,
  footerNote,
  accent = "#2563eb",
  accentSoft = "#dbeafe",
  badgeTone = "#2563eb",
  details = [],
  extraHtml = "",
}) {
  const detailCards = details
    .map(
      (detail) => `
        <div style="border-radius:18px;background:#ffffff;padding:18px 20px;border:1px solid #e2e8f0;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#64748b;">
            ${escapeHtml(detail.label)}
          </p>
          <p style="margin:0;font-size:15px;line-height:1.8;color:#0f172a;">
            ${escapeHtml(detail.value)}
          </p>
        </div>
      `,
    )
    .join("");

  return `
    <div style="margin:0;background-color:#f8fafc;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;">
        <tr>
          <td>
            <div style="border-radius:30px;background:linear-gradient(135deg,${accentSoft} 0%,#eff6ff 42%,#ffffff 100%);padding:30px 32px;box-shadow:0 20px 60px rgba(15,23,42,0.10);border:1px solid #e2e8f0;">
              <div style="display:inline-block;border-radius:999px;background:#ffffff;padding:8px 14px;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${badgeTone};">
                ${escapeHtml(eyebrow)}
              </div>
              <h1 style="margin:18px 0 10px;font-size:30px;line-height:1.2;font-weight:700;color:#0f172a;">
                ${escapeHtml(title)}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.85;color:#475569;">
                ${intro}
              </p>
              <a href="${escapeHtml(actionUrl)}" style="display:inline-block;border-radius:16px;background:linear-gradient(90deg,${accent} 0%,#7c3aed 100%);padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;box-shadow:0 14px 32px rgba(37,99,235,0.22);">
                ${escapeHtml(actionLabel)}
              </a>
              <div style="margin-top:24px;display:grid;grid-template-columns:1fr;gap:14px;">
                ${detailCards}
                ${extraHtml}
              </div>
            </div>
            <p style="margin:18px 10px 0;font-size:12px;line-height:1.7;color:#64748b;text-align:center;">
              ${escapeHtml(footerNote)}
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export function buildCalendarPanel({ label = "Deadline", title, date, caption }) {
  return `
    <div style="border-radius:22px;background:#ffffff;padding:18px 20px;border:1px solid #e2e8f0;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="flex:0 0 auto;width:54px;height:54px;border-radius:18px;background:linear-gradient(180deg,#eff6ff 0%,#ffffff 100%);border:1px solid #bfdbfe;display:flex;align-items:center;justify-content:center;color:#2563eb;font-size:24px;line-height:1;">
          <span aria-hidden="true">📅</span>
        </div>
        <div style="min-width:0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b;">
            ${escapeHtml(label)}
          </p>
          <p style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">
            ${escapeHtml(title)}
          </p>
          <p style="margin:6px 0 0;font-size:14px;line-height:1.7;color:#475569;">
            ${escapeHtml(date)}
          </p>
        </div>
      </div>
      ${caption ? `<p style="margin:14px 0 0;font-size:13px;line-height:1.8;color:#64748b;">${escapeHtml(caption)}</p>` : ""}
    </div>
  `;
}
