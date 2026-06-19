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
  };
}

// نمط الخلفية بملء الشاشة
export function backgroundStyle(bgUrl) {
  if (!bgUrl) return {};
  return {
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    backgroundRepeat: 'no-repeat',
  };
}
