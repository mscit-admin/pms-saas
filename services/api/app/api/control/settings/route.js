import { handler, ok } from '@/lib/http';
import { requireSuperAdmin, requireControlPermission } from '@/lib/control-auth';
import { getControlSettings, setControlSettings } from '@/lib/control-settings';

export const dynamic = 'force-dynamic';

// هوية المنصّة — أي مشرف يقرأها؛ التعديل يتطلّب manage_branding.
export const GET = handler(async () => {
  await requireSuperAdmin();
  return ok(await getControlSettings());
});

export const PUT = handler(async (req) => {
  await requireControlPermission('manage_branding');
  const body = await req.json().catch(() => ({}));
  return ok(await setControlSettings(body));
});
