import { NextResponse } from 'next/server';

// حماية الوصول للوحة عبر HTTP Basic Auth (اسم مستخدم + كلمة مرور من البيئة).
// إن لم تُضبط AUTH_USER/AUTH_PASSWORD يبقى الوصول مفتوحاً (للتوافق مع النشر الحالي).
// النقاط الآلية (/api/sync و /api/webhook) محميّة بأسرارها الخاصة فتُستثنى.

export const config = {
  // طبّق على كل شيء عدا أصول Next الثابتة
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export function middleware(req) {
  const user = process.env.AUTH_USER;
  const pass = process.env.AUTH_PASSWORD;

  // الحماية معطّلة حتى تُضبط بيانات الدخول
  if (!user || !pass) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/sync') || pathname.startsWith('/api/webhook')) {
    return NextResponse.next();
  }

  const header = req.headers.get('authorization') || '';
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const i = decoded.indexOf(':');
      const u = decoded.slice(0, i);
      const p = decoded.slice(i + 1);
      if (u === user && p === pass) return NextResponse.next();
    } catch {
      // ترويسة غير صالحة — نطلب المصادقة أدناه
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Jira Monitor", charset="UTF-8"' },
  });
}
