import { handler, ok } from '@/lib/http';
import { controlBrandManifest } from '@/lib/control-branding';

export const dynamic = 'force-dynamic';

// عام: يحتاجه شاشة الدخول والواجهة لعرض الشعار/الأيقونة.
export const GET = handler(async () => ok(await controlBrandManifest()));
