import { handler, ok } from '@/lib/http';
import { requireSuperAdmin } from '@/lib/control-auth';
import { FEATURE_KEYS } from '@/lib/orgs';

export const dynamic = 'force-dynamic';

// المشرف الحالي + كتالوج الوحدات (لرسم مفاتيح التفعيل في اللوحة).
export const GET = handler(async () => {
  const admin = await requireSuperAdmin();
  return ok({ admin, featureKeys: Object.keys(FEATURE_KEYS) });
});
