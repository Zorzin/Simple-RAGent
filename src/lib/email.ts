import nodemailer from "nodemailer";

type InviteEmailParams = {
  to: string;
  inviterName: string;
  organizationName: string;
  inviteUrl: string;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const secure = process.env.SMTP_SECURE === "true";

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is missing.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendInviteEmail({
  to,
  inviterName,
  organizationName,
  inviteUrl,
}: InviteEmailParams) {
  const from = process.env.SMTP_FROM;
  if (!from) {
    throw new Error("SMTP_FROM is not configured.");
  }

  const transporter = getTransport();
  const subject = `You're invited to ${organizationName}`;
  const text = `${inviterName} invited you to join ${organizationName}.\n\nAccept the invite: ${inviteUrl}`;
  const html = `<p><strong>${inviterName}</strong> invited you to join <strong>${organizationName}</strong>.</p><p><a href="${inviteUrl}">Accept the invite</a></p>`;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}
