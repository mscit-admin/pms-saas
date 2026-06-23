import { NextResponse } from 'next/server';
import { handler, ok, fail } from '@/lib/http';
import { requireUser } from '@/lib/auth';
import { saveAvatar, readAvatar, removeAvatar } from '@/lib/avatar';

export const dynamic = 'force-dynamic';
const MAX_BYTES = 4 * 1024 * 1024; // 4MB

// GET: يخدم صورة المستخدم الحالي (أو مستخدم محدّد عبر ?id= لعرضها في القوائم).
export async function GET(req) {
  const me = await requireUser().catch(() => null);
  if (!me) return new NextResponse('unauthorized', { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id') || me.id;
  const asset = await readAvatar(id);
  if (!asset) return new NextResponse('not found', { status: 404 });
  return new NextResponse(asset.data, {
    headers: { 'Content-Type': asset.mime, 'Cache-Control': 'private, max-age=30' },
  });
}

// POST: رفع صورة الملف الشخصي للمستخدم الحالي.
export const POST = handler(async (req) => {
  const me = await requireUser();
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return fail('الملف مطلوب', 400);
  const mime = file.type || '';
  if (!mime.startsWith('image/')) return fail('يجب أن يكون الملف صورة', 400);
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) return fail('حجم الصورة كبير جداً (الحد 4MB)', 400);
  await saveAvatar(me.id, buf, mime);
  return ok({ avatar: true });
});

// DELETE: إزالة صورة الملف الشخصي.
export const DELETE = handler(async () => {
  const me = await requireUser();
  await removeAvatar(me.id);
  return ok({ avatar: false });
});
