import { handler, ok } from '@/lib/http';
import { getTrend } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// الاتجاه الإداري: عدد الاستثناءات عبر آخر ?days=30 يوماً.
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const days = parseInt(url.searchParams.get('days') || '30', 10);
  const series = await getTrend({ days });
  return ok({ days, series });
});
