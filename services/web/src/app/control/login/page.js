'use client';

import { useEffect, useState } from 'react';

// دخول المشرف الأعلى — ثنائي اللغة (عربي/إنجليزي).
const T = {
  ar: { dir: 'rtl', other: 'English', title: 'لوحة المشرف الأعلى', sub: 'إدارة المستأجرين والمنصّة', user: 'اسم المستخدم', pass: 'كلمة المرور', login: 'دخول', failed: 'فشل الدخول', neterr: 'خطأ في الاتصال بالخادم' },
  en: { dir: 'ltr', other: 'العربية', title: 'Super-admin Console', sub: 'Manage tenants and the platform', user: 'Username', pass: 'Password', login: 'Sign in', failed: 'Sign-in failed', neterr: 'Server connection error' },
};

export default function ControlLogin() {
  const [lang, setLang] = useState('ar');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = T[lang];

  useEffect(() => {
    const sl = localStorage.getItem('controlLang');
    if (sl === 'ar' || sl === 'en') setLang(sl);
  }, []);
  function toggleLang() {
    const n = lang === 'ar' ? 'en' : 'ar';
    setLang(n); localStorage.setItem('controlLang', n);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/control/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error || t.failed); return; }
      window.location.href = '/control';
    } catch {
      setError(t.neterr);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir={t.dir} style={S.wrap}>
      <button style={S.langBtn} onClick={toggleLang}>{t.other}</button>
      <form onSubmit={submit} style={S.card}>
        <h1 style={S.title}>{t.title}</h1>
        <p style={S.sub}>{t.sub}</p>
        <input style={S.input} placeholder={t.user} value={username}
          onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input style={S.input} type="password" placeholder={t.pass} value={password}
          onChange={(e) => setPassword(e.target.value)} />
        {error && <div style={S.error}>{error}</div>}
        <button style={S.btn} disabled={busy}>{busy ? '…' : t.login}</button>
      </form>
    </div>
  );
}

const S = {
  wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f141b', fontFamily: 'system-ui, sans-serif', position: 'relative' },
  langBtn: { position: 'absolute', top: 18, insetInlineEnd: 18, background: 'transparent', color: '#cdd9e6', border: '1px solid #2b3543', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' },
  card: { width: 340, background: '#1a212b', border: '1px solid #2b3543', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 10px 40px rgba(0,0,0,.4)' },
  title: { color: '#e8eef5', margin: 0, fontSize: 20, textAlign: 'center' },
  sub: { color: '#8da2b8', margin: '0 0 8px', fontSize: 13, textAlign: 'center' },
  input: { padding: '11px 13px', borderRadius: 9, border: '1px solid #2b3543', background: '#0f141b', color: '#e8eef5', fontSize: 14, outline: 'none' },
  btn: { padding: '11px', borderRadius: 9, border: 'none', background: '#2f81f7', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  error: { color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
};
