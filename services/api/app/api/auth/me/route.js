import { handler, ok } from '@/lib/http';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// المستخدم الحالي + أدواره وصلاحياته (لتكييف الواجهة).
export const GET = handler(async () => {
  const user = await getCurrentUser();
  return ok({ user });
});
