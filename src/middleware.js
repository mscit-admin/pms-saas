import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// حارس الوصول: يتطلّب جلسة صالحة (JWT في كوكي httpOnly) لكل المسارات
// عدا صفحة الدخول ونقاط الآلة (sync/webhook بأسرارها) وفحص الصحة.
// التحقق هنا من صحة التوقيع فقط (edge)؛ فحص الصلاحيات يتم في الخادم.

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

const SESSION_COOKIE = 'jem_session';

function secretKey() {
  const s = process.env.SESSION_SECRET || process.env.SYNC_SECRET || 'dev-insecure-secret-change-me';
  return new TextEncoder().encode(s);
}

const PUBLIC = [
  '/login',
  '/api/auth/login',
  '/api/sync',
  '/api/webhook',
  '/api/health',
  '/api/branding', // الأصول العامة (شعار/خلفية/أيقونة) — الكتابة محميّة في المعالج
];

function isPublic(pathname) {
  return PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, secretKey());
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (valid) return NextResponse.next();

  // API بدون جلسة → 401 JSON؛ الصفحات → تحويل لصفحة الدخول
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'يجب تسجيل الدخول' }, { status: 401 });
  }
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}
