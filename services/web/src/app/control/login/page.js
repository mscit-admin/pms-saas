'use client';

import { useEffect, useState } from 'react';

// دخول المشرف الأعلى — ثنائي اللغة (عربي/إنجليزي) + وضع فاتح/داكن.
const T = {
  ar: { dir: 'rtl', other: 'English', title: 'لوحة المشرف الأعلى', sub: 'إدارة المستأجرين والمنصّة', user: 'اسم المستخدم', pass: 'كلمة المرور', login: 'دخول', failed: 'فشل الدخول', neterr: 'خطأ في الاتصال بالخادم' },
  en: { dir: 'ltr', other: 'العربية', title: 'Super-admin Console', sub: 'Manage tenants and the platform', user: 'Username', pass: 'Password', login: 'Sign in', failed: 'Sign-in failed', neterr: 'Server connection error' },
};

const THEME_VARS = {
  dark: { '--c-bg': '#0f141b', '--c-panel': '#1a212b', '--c-border': '#2b3543', '--c-text': '#e8eef5', '--c-muted': '#8da2b8', '--c-input': '#0f141b', '--c-accent': '#2f81f7' },
  light: { '--c-bg': '#f4f6f9', '--c-panel': '#ffffff', '--c-border': '#d8dee6', '--c-text': '#1b2430', '--c-muted': '#5c6b7a', '--c-input': '#ffffff', '--c-accent': '#2f81f7' },
};

export default function ControlLogin() {
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('dark');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = T[lang];

  useEffect(() => {
    const sl = localStorage.getItem('controlLang');
    if (sl === 'ar' || sl === 'en') setLang(sl);
    const th = localStorage.getItem('controlTheme');
    if (th === 'light' || th === 'dark') setTheme(th);
  }, []);
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

  return (
    <div dir={t.dir} style={{ ...THEME_VARS[theme], ...S.wrap }}>
      <div style={S.topBar}>
        <button style={S.iconBtn} onClick={toggleTheme} title="theme">{theme === 'dark' ? '☀' : '☾'}</button>
        <button style={S.langBtn} onClick={toggleLang}>{t.other}</button>
      </div>
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
  wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--c-bg)', fontFamily: 'system-ui, sans-serif', position: 'relative', transition: 'background .2s' },
  topBar: { position: 'absolute', top: 18, insetInlineEnd: 18, display: 'flex', gap: 8 },
  iconBtn: { background: 'transparent', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '6px 11px', fontSize: 14, cursor: 'pointer', lineHeight: 1 },
  langBtn: { background: 'transparent', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '6px 12px', fontSize: 13, cursor: 'pointer' },
  card: { width: 340, background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 10px 40px rgba(0,0,0,.25)' },
  title: { color: 'var(--c-text)', margin: 0, fontSize: 20, textAlign: 'center' },
  sub: { color: 'var(--c-muted)', margin: '0 0 8px', fontSize: 13, textAlign: 'center' },
  input: { padding: '11px 13px', borderRadius: 9, border: '1px solid var(--c-border)', background: 'var(--c-input)', color: 'var(--c-text)', fontSize: 14, outline: 'none' },
  btn: { padding: '11px', borderRadius: 9, border: 'none', background: 'var(--c-accent)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  error: { color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
};
