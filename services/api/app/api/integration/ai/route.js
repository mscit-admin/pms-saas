import { handler, ok } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { getAiSettings, saveAiSettings } from '@/lib/ai-settings';
import { logAudit, clientIp } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// قراءة إعدادات الذكاء (المفتاح لا يُعاد — وجوده فقط).
export const GET = handler(async () => {
  await requirePermission('manage_integration');
  const s = await getAiSettings();
  return ok({ enabled: s.enabled, provider: s.provider, baseUrl: s.baseUrl, model: s.model, hasKey: Boolean(s.apiKey) });
});

export const PUT = handler(async (req) => {
  const me = await requirePermission('manage_integration');
  const body = await req.json().catch(() => ({}));
  await saveAiSettings({
    enabled: body.enabled,
    provider: body.provider,
    baseUrl: body.baseUrl,
    model: body.model,
    apiKey: body.apiKey,
  });
  await logAudit({ action: 'ai_settings_update', actorId: me.id, actorName: me.username, targetType: 'ai', detail: body.provider, ip: clientIp(req) });
  return ok({ saved: true });
});
