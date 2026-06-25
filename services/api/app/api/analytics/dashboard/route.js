import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import {
  getExecutiveSummary, getTeamWorkload, getWipOverTime, getThroughput,
  getTrend, getCycleTime, getStageResidence,
} from '@/lib/analytics';
import { getExceptionCounts } from '@/lib/exceptions';
import { getUserScope } from '@/lib/companies';

export const dynamic = 'force-dynamic';

// بيانات لوحة المعلومات الموحّدة — تُرجع فقط الأقسام التي يملك المستخدم صلاحيتها.
export const GET = handler(async (req) => {
  const me = await requirePermission('view_dashboard');
  const scope = await getUserScope(me.id);
  const has = (k) => me.permissions.includes(k);
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(7, parseInt(url.searchParams.get('days') || '90', 10)));
  const weeks = Math.max(4, Math.ceil(days / 7));

  const out = { days };

  // مؤشّرات KPI (الإظهار لكل بطاقة في الواجهة حسب صلاحيات kpi_*)
  const [summary, counts] = await Promise.all([getExecutiveSummary({ scope, windowDays: days }), getExceptionCounts({ scope })]);
  out.kpis = {
    total: summary.totalTickets, open: summary.openTickets, done: summary.doneTickets,
    overdue: summary.overdueTickets, unassigned: summary.unassignedTickets,
    slaBreached: summary.slaBreached, avgCycle: summary.avgCycleDays,
    stagnant: counts.stagnant, review: counts.review,
    // الحزمة الأولى
    onTimePct: summary.onTimePct, slaCompliancePct: summary.slaCompliancePct,
    netFlow: summary.netFlow, flowCreated: summary.flowCreated, flowResolved: summary.flowResolved,
    unassignedWaitDays: summary.unassignedWaitDays,
  };

  const jobs = [];
  if (has('widget_workload')) jobs.push(getTeamWorkload({ scope }).then((items) => { out.workload = items; }));
  if (has('widget_wip')) jobs.push(getWipOverTime({ days }).then((d) => { out.wip = d; }));
  if (has('widget_throughput')) jobs.push(getThroughput({ weeks, scope }).then((d) => { out.throughput = d; }));
  if (has('widget_trend')) jobs.push(getTrend({ days }).then((series) => { out.trend = series; }));
  if (has('widget_cycle_priority') || has('widget_stage_time')) {
    jobs.push(Promise.all([getCycleTime({ days, scope }), getStageResidence({ days, scope })]).then(([cycle, stages]) => {
      out.cycle = cycle; out.stages = stages;
    }));
  }
  await Promise.all(jobs);

  return ok(out);
});
