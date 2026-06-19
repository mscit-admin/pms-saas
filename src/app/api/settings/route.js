import { handler, ok, fail } from '@/lib/http';
import { requireUser, requirePermission } from '@/lib/auth';
import { getAllSettings, setSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// القراءة لأي مستخدم مسجّل؛ التعديل يتطلب manage_settings.
export const GET = handler(async () => {
  await requireUser();
  return ok({ settings: await getAllSettings() });
});

export const PUT = handler(async (req) => {
  await requirePermission('manage_settings');
  const body = await req.json().catch(() => ({}));

  // رقم المنفذ
  if (body.app_port !== undefined) {
    const port = parseInt(body.app_port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return fail('رقم المنفذ يجب أن يكون بين 1 و 65535', 400);
    }
    await setSetting('app_port', port);
  }
  return ok({ settings: await getAllSettings() });
});
