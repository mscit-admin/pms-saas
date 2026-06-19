import { NextResponse } from 'next/server';
import { brandManifest } from '@/lib/branding';

export const dynamic = 'force-dynamic';

// أي الأصول مرفوعة (عام — تحتاجه صفحة الدخول قبل المصادقة).
export async function GET() {
  try {
    const m = await brandManifest();
    return NextResponse.json({ ok: true, data: m });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
