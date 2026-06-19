import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getSlaForecast } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// تنبؤ SLA: التذاكر المفتوحة مرتّبة حسب قرب/تجاوز الموعد النهائي.
export const GET = handler(async (req) => {
  await requirePermission('view_managerial');
  const url = new URL(req.url);
  const atRiskDays = parseInt(url.searchParams.get('atRiskDays') || '2', 10);
  const items = await getSlaForecast({ atRiskDays });

  const summary = items.reduce(
    (acc, x) => {
      acc[x.slaStatus] = (acc[x.slaStatus] || 0) + 1;
      return acc;
    },
    { breached: 0, at_risk: 0, on_track: 0 }
  );

  return ok({ summary, items });
});
