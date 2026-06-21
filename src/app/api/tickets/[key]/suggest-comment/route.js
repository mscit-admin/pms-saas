import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { getComments } from '@/lib/jira';
import { adfToText } from '@/lib/adf';
import { aiComplete } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// يقترح تعليقاً بالذكاء وفق حالة التذكرة وآخر تعليقاتها (يطابق لغة النقاش).
export const POST = handler(async (req, { params }) => {
  await requirePermission('act_tickets');

  const rows = await query(
    `SELECT issue_key, summary, status, priority, assignee_name,
        TIMESTAMPDIFF(DAY, last_status_change_at, UTC_TIMESTAMP()) AS days_in_status
     FROM tickets WHERE issue_key = :k`,
    { k: params.key }
  );
  const ti = rows[0];
  if (!ti) return fail('التذكرة غير موجودة محلياً', 404);

  const commResp = await getComments(params.key, 0, 5);
  const comments = (commResp.comments || []).map((c) => ({
    author: c.author?.displayName || '?',
    body: adfToText(c.body).trim(),
  }));

  // طابق لغة النقاش
  const blob = comments.map((c) => c.body).join(' ') + ' ' + (ti.summary || '');
  const lang = /[؀-ۿ]/.test(blob) ? 'Arabic' : 'English';

  const system = `You are a project-management assistant helping a manager follow up on a Jira ticket. `
    + `Draft a single, concise, professional comment appropriate to the ticket's current status and the recent discussion `
    + `(e.g. nudge the assignee, ask for an update, note a blocker, or confirm next steps). `
    + `Reply with ONLY the comment text — no preamble, no quotes — written in ${lang}.`;

  const user = [
    `Ticket ${ti.issue_key}: ${ti.summary}`,
    `Status: ${ti.status} | Priority: ${ti.priority} | Assignee: ${ti.assignee_name || 'unassigned'} | Days in status: ${ti.days_in_status}`,
    '',
    'Recent comments (newest first):',
    comments.length ? comments.map((c, i) => `${i + 1}. ${c.author}: ${c.body}`).join('\n') : '(no comments yet)',
    '',
    'Write a suitable next comment to post now.',
  ].join('\n');

  const suggestion = await aiComplete({ system, user });
  return ok({ suggestion, lang });
});
