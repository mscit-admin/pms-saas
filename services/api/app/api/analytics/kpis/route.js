import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getExecutiveSummary } from '@/lib/analytics';
import { getExceptionCounts } from '@/lib/exceptions';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// مؤشّرات لوحة المعلومات (KPI) في نداء واحد. الإظهار/الإخفاء حسب الصلاحيات في الواجهة.
export const GET = handler(async () => {
  const me = await requirePermission('view_dashboard');
  const scope = await getUserScope(me.id);
  const [summary, counts] = await Promise.all([getExecutiveSummary({ scope }), getExceptionCounts({ scope })]);
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
