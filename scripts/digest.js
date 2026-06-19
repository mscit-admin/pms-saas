#!/usr/bin/env node
// ملخّص دوري (يومي/أسبوعي) يُرسَل بالبريد/Webhook. التشغيل عبر cron:
//   0 7 * * *  cd /GHProjects/jira-monitor && npm run digest
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { getExecutiveSummary, getSlaForecast } = await import('../src/lib/analytics.js');
const { getExceptionCounts, getExceptions } = await import('../src/lib/exceptions.js');
const { notify, notifyConfigured } = await import('../src/lib/notify.js');
const { getJiraSettings } = await import('../src/lib/jira-settings.js');
const jiraSettings = await getJiraSettings();

if (!notifyConfigured()) {
  console.error('✗ لا توجد قناة إشعار مهيّأة (SMTP أو ALERT_WEBHOOK_URL)');
  process.exit(1);
}

const [summary, counts, sla, exceptions] = await Promise.all([
  getExecutiveSummary(),
  getExceptionCounts(),
  getSlaForecast({ atRiskDays: 2 }),
  getExceptions(),
]);

const breached = sla.items.filter((x) => x.slaStatus === 'breached').slice(0, 10);
const topOverdue = exceptions.filter((e) => e.reasons.includes('overdue')).slice(0, 10);

const link = (k) => (jiraSettings.baseUrl ? `${jiraSettings.baseUrl}/browse/${k}` : k);

const subject = `ملخّص مراقب جيرا — ${new Date().toLocaleDateString('ar-EG-u-nu-latn')}`;

const text = [
  subject,
  '',
  `إجمالي: ${summary.totalTickets} · مفتوحة: ${summary.openTickets} · منجزة: ${summary.doneTickets}`,
  `استثناءات — متأخر: ${counts.overdue} · راكد: ${counts.stagnant} · مراجعة: ${counts.review} · بدون مسؤول: ${counts.unassigned}`,
  `SLA — متجاوز: ${summary.slaBreached} · متوسط زمن الدورة: ${summary.avgCycleDays} يوم`,
  '',
  'أبرز المتأخرات:',
  ...topOverdue.map((e) => `• ${e.key} — ${e.summary} (${e.assignee || 'بدون مسؤول'})`),
].join('\n');

const rows = (arr, cols) => arr.map((x) => `<tr>${cols(x).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('');

const html = `
  <div style="font-family:sans-serif;direction:rtl">
    <h2>${subject}</h2>
    <p>إجمالي: <b>${summary.totalTickets}</b> · مفتوحة: <b>${summary.openTickets}</b> · منجزة: <b>${summary.doneTickets}</b></p>
    <p>متأخر: <b>${counts.overdue}</b> · راكد: <b>${counts.stagnant}</b> · مراجعة: <b>${counts.review}</b> · بدون مسؤول: <b>${counts.unassigned}</b></p>
    <p>SLA متجاوز: <b>${summary.slaBreached}</b> · متوسط زمن الدورة: <b>${summary.avgCycleDays}</b> يوم</p>
    <h3>متجاوزو SLA</h3>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <tr><th>المفتاح</th><th>الأولوية</th><th>أيام متأخرة</th></tr>
      ${rows(breached, (x) => [`<a href="${link(x.key)}">${x.key}</a>`, x.priority, Math.abs(x.daysRemaining)])}
    </table>
    <h3>أبرز المتأخرات</h3>
    <table border="1" cellpadding="6" style="border-collapse:collapse">
      <tr><th>المفتاح</th><th>الملخّص</th><th>المسؤول</th></tr>
      ${rows(topOverdue, (x) => [`<a href="${link(x.key)}">${x.key}</a>`, x.summary, x.assignee || 'بدون مسؤول'])}
    </table>
  </div>`;

try {
  await notify({ subject, text, html });
  console.log('✓ أُرسل الملخّص.');
  process.exit(0);
} catch (err) {
  console.error('✗ فشل إرسال الملخّص:', err.message);
  process.exit(1);
}
