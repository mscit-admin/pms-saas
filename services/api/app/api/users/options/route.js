import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// قائمة مختصرة بالمستخدمين النشطين (لاختيار مالك المتابعة) — لا تتطلب إدارة مستخدمين.
export const GET = handler(async () => {
  await requirePermission('manage_exceptions');
  const rows = await query(
    `SELECT id, COALESCE(full_name, username) AS name FROM users WHERE is_active = 1 ORDER BY name ASC`
  );
  return ok({ users: rows });
});
