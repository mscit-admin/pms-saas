import { NextResponse } from 'next/server';
import { isControlBrandType, readControlAsset } from '@/lib/control-branding';

export const dynamic = 'force-dynamic';

// عام: يخدم الصورة (شعار/أيقونة) — تحتاجها صفحة الدخول دون مصادقة.
export async function GET(req, { params }) {
  if (!isControlBrandType(params.type)) return new NextResponse('not found', { status: 404 });
  const asset = await readControlAsset(params.type);
  if (!asset) return new NextResponse('not found', { status: 404 });
  return new NextResponse(asset.data, {
    headers: { 'Content-Type': asset.mime, 'Cache-Control': 'public, max-age=60' },
  });
}
