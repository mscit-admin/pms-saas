import { handler, ok } from '@/lib/http';
import { getExecutiveSummary } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// الملخص التنفيذي للوحة الإدارية.
export const GET = handler(async () => {
  const summary = await getExecutiveSummary();
  return ok(summary);
});
