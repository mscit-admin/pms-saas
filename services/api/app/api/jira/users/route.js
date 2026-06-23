import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { searchUsers } from '@/lib/jira';

export const dynamic = 'force-dynamic';

// بحث مستخدمي جيرا للإشارات (@) داخل التعليقات.
export const GET = handler(async (req) => {
  await requirePermission('act_tickets');
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const users = await searchUsers(q);
  return ok({ users });
});
