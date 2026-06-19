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

  const url = (type) => (b && b[type] ? `/api/branding/asset/${type}?v=${b.ts}` : null);
  return {
    manifest: b, url, logo: url('logo'), background: url('background'),
    appName: b?.appName || '', appSubtitle: b?.appSubtitle || '',
    bgDim: b?.bgDim ?? 85,
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
