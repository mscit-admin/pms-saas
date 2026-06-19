import { handler, ok, fail } from '@/lib/http';
import { requireUser, requirePermission } from '@/lib/auth';
import { getAllSettings, setSetting, applyPortRuntime } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// القراءة لأي مستخدم مسجّل؛ التعديل يتطلب manage_settings.
export const GET = handler(async () => {
  await requireUser();
  return ok({ settings: await getAllSettings() });
});

export const PUT = handler(async (req) => {
  await requirePermission('manage_settings');
  const body = await req.json().catch(() => ({}));
  let portApply = null;

  // اسم التطبيق وعنوانه الفرعي (إعادة التسمية)
  if (body.app_name !== undefined) await setSetting('app_name', String(body.app_name).slice(0, 120));
  if (body.app_subtitle !== undefined) await setSetting('app_subtitle', String(body.app_subtitle).slice(0, 200));

  // خفوت الخلفيتين (0..100) + إظهار/إخفاء كل خلفية
  const clampDim = (v) => Math.max(0, Math.min(100, parseInt(v, 10) || 0));
  if (body.app_bg_dim !== undefined) await setSetting('app_bg_dim', clampDim(body.app_bg_dim));
  if (body.login_bg_dim !== undefined) await setSetting('login_bg_dim', clampDim(body.login_bg_dim));
  if (body.app_bg_show !== undefined) await setSetting('app_bg_show', body.app_bg_show ? 1 : 0);
  if (body.login_bg_show !== undefined) await setSetting('login_bg_show', body.login_bg_show ? 1 : 0);

  // رقم المنفذ — يُطبَّق فعلياً بإعادة تشغيل الخدمة وتحديث nginx
  if (body.app_port !== undefined) {
    const port = parseInt(body.app_port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return fail('رقم المنفذ يجب أن يكون بين 1 و 65535', 400);
    }
    await setSetting('app_port', port);
    portApply = await applyPortRuntime(port);
  }

  return ok({ settings: await getAllSettings(), portApply });
});
