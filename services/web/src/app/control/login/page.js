'use client';

import { useEffect, useState } from 'react';

// دخول المشرف الأعلى — ثنائي اللغة (عربي/إنجليزي) + وضع فاتح/داكن.
const T = {
  ar: { dir: 'rtl', other: 'English', title: 'لوحة المشرف الأعلى', sub: 'إدارة المستأجرين والمنصّة', user: 'اسم المستخدم', pass: 'كلمة المرور', login: 'دخول', failed: 'فشل الدخول', neterr: 'خطأ في الاتصال بالخادم' },
  en: { dir: 'ltr', other: 'العربية', title: 'Super-admin Console', sub: 'Manage tenants and the platform', user: 'Username', pass: 'Password', login: 'Sign in', failed: 'Sign-in failed', neterr: 'Server connection error' },
};

const THEME_VARS = {
  dark: { '--c-bg': '#15181d', '--c-panel': '#1f242b', '--c-border': '#2e343d', '--c-text': '#e9ebee', '--c-muted': '#9097a0', '--c-input': '#23282f', '--c-accent': '#2490EF' },
  light: { '--c-bg': '#f4f5f6', '--c-panel': '#ffffff', '--c-border': '#e6e9ec', '--c-text': '#1c2024', '--c-muted': '#7a8189', '--c-input': '#ffffff', '--c-accent': '#2490EF' },
};

export default function ControlLogin() {
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('light');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [brand, setBrand] = useState(null);
  const t = T[lang];

  useEffect(() => {
    const sl = localStorage.getItem('controlLang');
    if (sl === 'ar' || sl === 'en') setLang(sl);
    const th = localStorage.getItem('controlTheme');
    if (th === 'light' || th === 'dark') setTheme(th);
    fetch('/api/control/branding/manifest')
      .then((r) => r.json()).then((j) => { if (j.ok) setBrand(j.data); }).catch(() => {});
  }, []);

  // أيقونة التبويب من هوية المنصّة
  useEffect(() => {
    if (!brand?.favicon) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = `/api/control/branding/asset/favicon?v=${brand.ts || ''}`;
  }, [brand]);
  function toggleLang() {
    const n = lang === 'ar' ? 'en' : 'ar';
    setLang(n); localStorage.setItem('controlLang', n);
  }
  function toggleTheme() {
    const n = theme === 'dark' ? 'light' : 'dark';
    setTheme(n); localStorage.setItem('controlTheme', n);
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

  const bgStyle = brand?.loginBackground
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,.45), rgba(0,0,0,.45)), url(/api/control/branding/asset/login_background?v=${brand.ts || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : null;

  return (
    <div dir={t.dir} style={{ ...THEME_VARS[theme], ...S.wrap, ...bgStyle }}>
      <div style={S.topBar}>
        <button style={S.iconBtn} onClick={toggleTheme} title="theme">{theme === 'dark' ? '☀' : '☾'}</button>
        <button style={S.langBtn} onClick={toggleLang}>{t.other}</button>
      </div>
      <form onSubmit={submit} style={S.card}>
        {brand?.logo && <img src={`/api/control/branding/asset/logo?v=${brand.ts || ''}`} alt="logo" style={S.logo} />}
        <h1 style={S.title}>{brand?.platformName || t.title}</h1>
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
  wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--c-bg)', fontFamily: 'inherit', position: 'relative', transition: 'background .2s' },
  topBar: { position: 'absolute', top: 18, insetInlineEnd: 18, display: 'flex', gap: 8 },
  iconBtn: { background: 'transparent', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '6px 11px', fontSize: 14, cursor: 'pointer', lineHeight: 1 },
  langBtn: { background: 'transparent', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' },
  card: { width: 340, background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 10px 40px rgba(0,0,0,.25)' },
  logo: { maxHeight: 48, maxWidth: 200, objectFit: 'contain', alignSelf: 'center', marginBottom: 4 },
  title: { color: 'var(--c-text)', margin: 0, fontSize: 20, textAlign: 'center' },
  sub: { color: 'var(--c-muted)', margin: '0 0 8px', fontSize: 13, textAlign: 'center' },
  input: { padding: '11px 13px', borderRadius: 9, border: '1px solid var(--c-border)', background: 'var(--c-input)', color: 'var(--c-text)', fontSize: 14, outline: 'none' },
  btn: { padding: '11px', borderRadius: 9, border: 'none', background: 'var(--c-accent)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  error: { color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
};
