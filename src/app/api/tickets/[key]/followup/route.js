import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { setFollowup } from '@/lib/followup';

export const dynamic = 'force-dynamic';

// تحديث حالة المتابعة الإدارية لتذكرة (إقرار/تأجيل/مالك/سبب جذري).
export const POST = handler(async (req, { params }) => {
  const me = await requirePermission('manage_exceptions');
  const body = await req.json().catch(() => ({}));
  await setFollowup(params.key, {
    acknowledged: body.acknowledged,
    ackBy: me.id,
    note: body.note,
    snoozeUntil: body.snoozeUntil,
    ownerUserId: body.ownerUserId,
    rootCause: body.rootCause,
  });
  return ok({ key: params.key, updated: true });
});
