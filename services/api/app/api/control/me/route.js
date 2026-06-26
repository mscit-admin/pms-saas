import { handler, ok } from '@/lib/http';
import { requireSuperAdmin } from '@/lib/control-auth';
import { FEATURE_KEYS } from '@/lib/orgs';
import { CONTROL_PERMISSIONS } from '@/lib/control-admins';

export const dynamic = 'force-dynamic';

// المشرف الحالي (مع صلاحياته) + كتالوجَي الوحدات وصلاحيات المشرفين.
export const GET = handler(async () => {
  const admin = await requireSuperAdmin();
  return ok({ admin, featureKeys: Object.keys(FEATURE_KEYS), controlPermissions: CONTROL_PERMISSIONS });
});
