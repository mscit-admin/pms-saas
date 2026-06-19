'use client';

import { useEffect, useRef, useState } from 'react';
import { useBranding, backgroundStyle } from '@/components/branding';

const L = {
  ar: { dir: 'rtl', sub: 'تسجيل الدخول للوحة الاستثناءات', user: 'اسم المستخدم', pass: 'كلمة المرور', code: 'رمز التحقق (TOTP)', login: 'دخول', confirm: 'تأكيد', drag: 'اسحب لتحريك المربع', failed: 'تعذّر تسجيل الدخول', neterr: 'خطأ في الاتصال بالخادم', other: 'English' },
  en: { dir: 'ltr', sub: 'Sign in to the exceptions board', user: 'Username', pass: 'Password', code: 'Verification code (TOTP)', login: 'Sign in', confirm: 'Confirm', drag: 'Drag to move the box', failed: 'Sign-in failed', neterr: 'Server connection error', other: 'العربية' },
};

// صفحة تسجيل الدخول — لغة + ثيم قابلان للتبديل، مربع قابل للسحب، خلفية بملء الشاشة.
export default function LoginPage() {
  const { logo, loginBackground, appName, loginBgDim, loginBgShow } = useBranding();
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('light');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const t = L[lang];

  // موضع المربع (سحب بالماوس)
  const [pos, setPos] = useState(null);
  const posRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const sl = localStorage.getItem('lang'); if (sl === 'ar' || sl === 'en') setLang(sl);
    const st = localStorage.getItem('theme'); if (st === 'light' || st === 'dark') setTheme(st);
    const s = localStorage.getItem('loginPos');
    if (s) { try { const p = JSON.parse(s); setPos(p); posRef.current = p; } catch { /* تجاهل */ } }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    localStorage.setItem('lang', lang);
  }, [lang, t.dir]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  function onDown(e) {
    const box = e.currentTarget.parentElement.getBoundingClientRect();
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e) {
    if (!drag.current) return;
    const p = { x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy };
    posRef.current = p;
    setPos(p);
  }
  function onUp() {
    if (drag.current) {
      drag.current = null;
      if (posRef.current) localStorage.setItem('loginPos', JSON.stringify(posRef.current));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, token: token || undefined }),
      });
      const body = await res.json();
      if (!body.ok) { setError(body.error || t.failed); return; }
      if (body.data?.needs2fa) { setNeeds2fa(true); return; }
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('next') || '/';
    } catch {
      setError(t.neterr);
    } finally {
      setBusy(false);
    }
  }

  const positioned = pos ? { position: 'absolute', left: pos.x, top: pos.y, margin: 0 } : {};
  const pill = { background: 'transparent', color: 'var(--c-muted)', border: '1px solid var(--c-border)', borderRadius: 6, padding: '4px 10px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };

  return (
    <div
      style={{
        position: 'relative', minHeight: '100vh', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--c-bg)', color: 'var(--c-text)', ...backgroundStyle(loginBgShow ? loginBackground : null, loginBgDim),
      }}
    >
      <form
        onSubmit={submit}
        style={{ background: 'var(--c-card)', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: 10, width: 340, boxShadow: '0 4px 20px rgba(0,0,0,.18)', ...positioned }}
      >
        {/* شريط السحب */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          title={t.drag}
          style={{ cursor: 'move', padding: '10px 16px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}
        >
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="logo" style={{ height: 28, maxWidth: 120, objectFit: 'contain' }} />
          )}
          <span style={{ fontWeight: 700 }}>{appName || 'مراقب جيرا'}</span>
          <span style={{ marginInlineStart: 'auto', color: 'var(--c-muted)' }}>⠿</span>
        </div>

        <div style={{ padding: 22 }}>
          {/* مبدّلات الثيم (يسار) واللغة (يمين) داخل المربع */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={pill}>
              {theme === 'dark' ? '☀︎' : '☾'}
            </button>
            <button type="button" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={pill}>
              {t.other}
            </button>
          </div>

          <p style={{ color: 'var(--c-muted)', fontSize: 13, marginTop: 0 }}>{t.sub}</p>

          <label style={lbl}>{t.user}</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={needs2fa} style={inp} autoFocus />

          <label style={lbl}>{t.pass}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={needs2fa} style={inp} />

          {needs2fa && (
            <>
              <label style={lbl}>{t.code}</label>
              <input value={token} onChange={(e) => setToken(e.target.value)} inputMode="numeric" placeholder="123456" style={{ ...inp, letterSpacing: 4, textAlign: 'center' }} autoFocus />
            </>
          )}

          {error && <div style={{ color: '#e03636', fontSize: 13, margin: '8px 0' }}>{error}</div>}

          <button type="submit" disabled={busy} style={btn}>
            {busy ? '…' : needs2fa ? t.confirm : t.login}
          </button>
        </div>
      </form>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 13, color: 'var(--c-text)', margin: '12px 0 4px' };
const inp = { width: '100%', boxSizing: 'border-box', border: '1px solid var(--c-border)', background: 'var(--c-card)', color: 'var(--c-text)', borderRadius: 6, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit' };
const btn = { width: '100%', marginTop: 18, background: '#1f7a4d', color: '#fff', border: 0, borderRadius: 6, padding: '10px', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
