import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getUserProjectIds, setUserProjects } from '@/lib/companies';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// مشاريع مستخدم معيّن: GET ?userId= → قائمة المعرّفات. POST {userId, projectIds} → ضبطها.
export const GET = handler(async (req) => {
  await requirePermission('manage_companies');
  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return fail('المستخدم مطلوب', 400);
  return ok({ projectIds: await getUserProjectIds(userId) });
});

export const POST = handler(async (req) => {
  const me = await requirePermission('manage_companies');
  const { userId, projectIds } = await req.json().catch(() => ({}));
  if (!userId) return fail('المستخدم مطلوب', 400);
  await setUserProjects(userId, (projectIds || []).map((x) => Number(x)));
  await logAudit({ action: 'user_projects_set', actorId: me.id, actorName: me.username, targetType: 'user', targetId: String(userId), detail: `${(projectIds || []).length} مشروع`, ip: clientIp(req) });
  return ok({ saved: true });
});
