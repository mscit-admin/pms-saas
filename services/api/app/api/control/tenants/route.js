import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { listOrgs, updateOrg } from '@/lib/orgs';
import { provisionTenant } from '@/lib/provision';
import { isValidSlug, isSlugAvailable } from '@/lib/tenancy';

export const dynamic = 'force-dynamic';

// سرد كل المستأجرين.
export const GET = handler(async () => {
  await requireControlPermission('manage_tenants');
  return ok({ items: await listOrgs() });
});

// إضافة مستأجر جديد: توفير قاعدة + أدمن، ثم تطبيق الخطة/الحصص/الوحدات.
export const POST = handler(async (req) => {
  await requireControlPermission('manage_tenants');
  const b = await req.json().catch(() => ({}));
  const slug = String(b.slug || '').toLowerCase().trim();
  if (!isValidSlug(slug)) return fail('النطاق الفرعي غير صالح (حروف صغيرة وأرقام وشَرطات).', 400);
  if (!(await isSlugAvailable(slug))) return fail('النطاق الفرعي محجوز أو مستخدَم.', 409);
  if (!b.adminPassword) return fail('كلمة مرور الأدمن مطلوبة.', 400);

  await provisionTenant({
    name: b.name || slug,
    slug,
    adminUsername: b.adminUsername || 'admin',
    adminPassword: b.adminPassword,
  });

  // خصائص اختيارية تُطبَّق بعد التوفير
  const patch = {};
  for (const k of ['plan', 'maxUsers', 'maxProjects', 'syncIntervalMinutes', 'features']) {
    if (b[k] !== undefined) patch[k] = b[k];
  }
  const org = Object.keys(patch).length ? await updateOrg(slug, patch) : null;
  return ok({ slug, org });
});
