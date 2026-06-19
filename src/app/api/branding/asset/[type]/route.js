import { NextResponse } from 'next/server';
import { handler, ok, fail } from '@/lib/http';
import { requirePermission } from '@/lib/auth';
import { isBrandType, saveAsset, readAsset, removeAsset } from '@/lib/branding';

export const dynamic = 'force-dynamic';
const MAX_BYTES = 6 * 1024 * 1024; // 6MB

// GET عام: يخدم الصورة (شعار/خلفية/أيقونة) — تحتاجها صفحة الدخول دون مصادقة.
export async function GET(req, { params }) {
  if (!isBrandType(params.type)) return new NextResponse('not found', { status: 404 });
  const asset = await readAsset(params.type);
  if (!asset) return new NextResponse('not found', { status: 404 });
  return new NextResponse(asset.data, {
    headers: { 'Content-Type': asset.mime, 'Cache-Control': 'public, max-age=60' },
  });
}

// POST: رفع أصل (صلاحية manage_branding).
export const POST = handler(async (req, { params }) => {
  await requirePermission('manage_branding');
  if (!isBrandType(params.type)) return fail('نوع غير معروف', 400);
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return fail('الملف مطلوب', 400);
  const mime = file.type || '';
  if (!mime.startsWith('image/')) return fail('يجب أن يكون الملف صورة', 400);
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) return fail('حجم الصورة كبير جداً (الحد 6MB)', 400);
  await saveAsset(params.type, buf, mime);
  return ok({ type: params.type, mime, size: buf.length });
});

// DELETE: إزالة أصل.
export const DELETE = handler(async (req, { params }) => {
  await requirePermission('manage_branding');
  if (!isBrandType(params.type)) return fail('نوع غير معروف', 400);
  await removeAsset(params.type);
  return ok({ type: params.type, removed: true });
});
