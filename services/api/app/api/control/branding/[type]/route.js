import { handler, ok, fail } from '@/lib/http';
import { requireControlPermission } from '@/lib/control-auth';
import { isControlBrandType, saveControlAsset, removeControlAsset } from '@/lib/control-branding';

export const dynamic = 'force-dynamic';
const MAX_BYTES = 6 * 1024 * 1024; // 6MB

// رفع أصل هوية المنصّة (شعار/أيقونة) — يتطلّب manage_branding.
export const POST = handler(async (req, { params }) => {
  await requireControlPermission('manage_branding');
  if (!isControlBrandType(params.type)) return fail('نوع غير معروف', 400);
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return fail('الملف مطلوب', 400);
  const mime = file.type || '';
  if (!mime.startsWith('image/')) return fail('يجب أن يكون الملف صورة', 400);
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) return fail('حجم الصورة كبير جداً (الحد 6MB)', 400);
  await saveControlAsset(params.type, buf, mime);
  return ok({ type: params.type, mime, size: buf.length });
});

export const DELETE = handler(async (req, { params }) => {
  await requireControlPermission('manage_branding');
  if (!isControlBrandType(params.type)) return fail('نوع غير معروف', 400);
  await removeControlAsset(params.type);
  return ok({ type: params.type, removed: true });
});
