'use client';

import { useEffect, useState } from 'react';

// يجلب بيان الهوية (أي الأصول مرفوعة) ويوفّر روابطها مع كسر التخزين المؤقت.
export function useBranding() {
  const [b, setB] = useState(null);

  useEffect(() => {
    fetch('/api/branding/manifest', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setB(j.data || null))
      .catch(() => {});
  }, []);

  const asset = (type, present) => (present ? `/api/branding/asset/${type}?v=${b.ts}` : null);
  return {
    manifest: b,
    logo: b ? asset('logo', b.logo) : null,
    appBackground: b ? asset('background', b.background) : null,
    loginBackground: b ? asset('login_background', b.loginBackground) : null,
    appName: b?.appName || '', appSubtitle: b?.appSubtitle || '',
    appNameEn: b?.appNameEn || '', appSubtitleEn: b?.appSubtitleEn || '',
    pageSize: b?.pageSize ?? 25,
    appBgDim: b?.appBgDim ?? 85,
    loginBgDim: b?.loginBgDim ?? 85,
    appBgShow: b?.appBgShow ?? true,
    loginBgShow: b?.loginBgShow ?? true,
  };
}

// نمط الخلفية بملء الشاشة مع طبقة تخفيف (dim 0..100) فوق الصورة لزيادة وضوح المحتوى.
export function backgroundStyle(bgUrl, dim = 85) {
  if (!bgUrl) return {};
  const a = Math.max(0, Math.min(1, Number(dim) / 100));
  return {
    backgroundImage: `linear-gradient(rgba(244,245,246,${a}), rgba(244,245,246,${a})), url(${bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat',
  };
}
