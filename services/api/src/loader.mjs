// خطّاف دقّة (ESM resolve hook) يسمح لملفات المعالجات المنقولة كما هي من Next.js
// بالعمل داخل خدمة Express دون أي تعديل على شيفرتها:
//   - '@/lib/<x>'   →  '@pms/core/<x>'  (الحزمة المشتركة)
//   - 'next/server' →  بديل محلّي يوفّر NextResponse فوق Web Response القياسي
// أي مسار آخر يمرّ للدقّة الافتراضية.

const SHIM_NEXT_SERVER = new URL('../shims/next-server.js', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/lib/')) {
    return nextResolve(`@pms/core/${specifier.slice('@/lib/'.length)}`, context);
  }
  if (specifier === 'next/server') {
    return nextResolve(SHIM_NEXT_SERVER, context);
  }
  return nextResolve(specifier, context);
}
