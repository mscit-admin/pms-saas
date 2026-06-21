import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getExecutiveSummary } from '@/lib/analytics';
import { getExceptionCounts } from '@/lib/exceptions';

export const dynamic = 'force-dynamic';

// مؤشّرات لوحة المعلومات (KPI) في نداء واحد. الإظهار/الإخفاء حسب الصلاحيات في الواجهة.
export const GET = handler(async () => {
  await requirePermission('view_dashboard');
  const [summary, counts] = await Promise.all([getExecutiveSummary(), getExceptionCounts()]);
  return ok({
    total: summary.totalTickets,
    open: summary.openTickets,
    done: summary.doneTickets,
    overdue: summary.overdueTickets,
    unassigned: summary.unassignedTickets,
    slaBreached: summary.slaBreached,
    avgCycle: summary.avgCycleDays,
    stagnant: counts.stagnant,
    review: counts.review,
  });
});
