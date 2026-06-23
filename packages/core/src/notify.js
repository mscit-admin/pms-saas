import nodemailer from 'nodemailer';

// طبقة الإشعارات: بريد (SMTP) + Webhook (Slack/Teams/Discord) — كلها اختيارية عبر البيئة.

function int(v, d) { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; }

export const notifyConfig = {
  webhookUrl: process.env.ALERT_WEBHOOK_URL || '',
  emailTo: (process.env.ALERT_EMAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'jira-monitor@localhost',
  },
};

export function notifyConfigured() {
  return Boolean(notifyConfig.webhookUrl || (notifyConfig.smtp.host && notifyConfig.emailTo.length));
}

let transporter;
function getTransporter() {
  if (!notifyConfig.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: notifyConfig.smtp.host,
      port: notifyConfig.smtp.port,
      secure: notifyConfig.smtp.secure,
      auth: notifyConfig.smtp.user ? { user: notifyConfig.smtp.user, pass: notifyConfig.smtp.pass } : undefined,
    });
  }
  return transporter;
}

async function sendWebhook(text) {
  if (!notifyConfig.webhookUrl) return;
  // صيغة عامة تعمل مع Slack/Teams (text) و Discord (content)
  await fetch(notifyConfig.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, content: text }),
  }).catch((e) => console.error('[notify webhook]', e.message));
}

async function sendEmail(subject, html) {
  const tx = getTransporter();
  if (!tx || notifyConfig.emailTo.length === 0) return;
  await tx
    .sendMail({ from: notifyConfig.smtp.from, to: notifyConfig.emailTo.join(','), subject, html })
    .catch((e) => console.error('[notify email]', e.message));
}

// إرسال إشعار عبر كل القنوات المهيّأة
export async function notify({ subject, text, html }) {
  await Promise.all([
    sendWebhook(text || subject),
    sendEmail(subject, html || `<pre style="font-family:inherit">${text || ''}</pre>`),
  ]);
}
