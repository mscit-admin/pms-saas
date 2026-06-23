import { handler, ok } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { getIssueExtra, getComments } from '@/lib/jira';
import { adfToText } from '@/lib/adf';

export const dynamic = 'force-dynamic';

// تاريخ التذكرة الكامل (مباشر من جيرا): سجل التغييرات + المهام الفرعية + التعليقات.
export const GET = handler(async (req, { params }) => {
  await requireUser();
  const url = new URL(req.url);
  const cstart = Math.max(0, parseInt(url.searchParams.get('cstart') || '0', 10));

  const [extra, comm] = await Promise.all([
    getIssueExtra(params.key),
    getComments(params.key, cstart, 30),
  ]);

  // سجل التغييرات (الأحدث أولاً)
  const changelog = (extra.changelog?.histories || []).map((h) => ({
    created: h.created,
    author: h.author?.displayName || null,
    items: (h.items || []).map((i) => ({ field: i.field, from: i.fromString, to: i.toString })),
  })).reverse();

  const subtasks = (extra.fields?.subtasks || []).map((s) => ({
    key: s.key,
    summary: s.fields?.summary || '',
    status: s.fields?.status?.name || null,
  }));

  const comments = {
    total: comm.total ?? 0,
    startAt: comm.startAt ?? cstart,
    items: (comm.comments || []).map((c) => ({
      author: c.author?.displayName || null,
      created: c.created,
      body: adfToText(c.body).trim(),
    })),
  };

  return ok({ changelog, subtasks, comments });
});
