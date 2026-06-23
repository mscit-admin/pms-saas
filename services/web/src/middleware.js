import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// حارس وصول الصفحات في خدمة الواجهة: يتطلّب جلسة صالحة لعرض الصفحات،
// ويحوّل غير المصادَقين إلى صفحة الدخول. أما طلبات /api فتُمرَّر كما هي إلى
// خدمة الـ API (عبر إعادة الكتابة في next.config) حيث تُفرض المصادقة هناك.

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

const SESSION_COOKIE = 'jem_session';

function secretKey() {
  const s = process.env.SESSION_SECRET || process.env.SYNC_SECRET || 'dev-insecure-secret-change-me';
  return new TextEncoder().encode(s);
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // طلبات الـ API تُمرَّر إلى خدمة الـ API (هي من يفرض الجلسة/الصلاحيات)
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // صفحة الدخول عامّة
  if (pathname === '/login') return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await jwtVerify(token, secretKey());
      return NextResponse.next();
    } catch { /* توقيع غير صالح */ }
  }

  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}
