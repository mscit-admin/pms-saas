'use client';

import { useEffect, useRef, useState } from 'react';
import { useBranding, backgroundStyle } from '@/components/branding';

// صفحة تسجيل الدخول — خطوتان: كلمة المرور، ثم رمز TOTP إن كان مفعّلاً.
// المربع قابل للسحب بالماوس لأي موضع (يُحفظ الموضع محلياً)، وخلفية بملء الشاشة.
export default function LoginPage() {
  const { logo, loginBackground, appName, loginBgDim, loginBgShow } = useBranding();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // موضع المربع (سحب بالماوس)
  const [pos, setPos] = useState(null);
  const posRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const s = localStorage.getItem('loginPos');
    if (s) { try { const p = JSON.parse(s); setPos(p); posRef.current = p; } catch { /* تجاهل */ } }
  }, []);

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
      if (!body.ok) { setError(body.error || 'تعذّر تسجيل الدخول'); return; }
      if (body.data?.needs2fa) { setNeeds2fa(true); return; }
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('next') || '/';
    } catch {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setBusy(false);
    }
  }

  const positioned = pos
    ? { position: 'absolute', left: pos.x, top: pos.y, margin: 0 }
    : {};

  return (
    <div
      style={{
        position: 'relative', minHeight: '100vh', width: '100%', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f4f5f6', ...backgroundStyle(loginBgShow ? loginBackground : null, loginBgDim),
      }}
    >
      {/* حركة كأمواج البحر + طفو المربع */}
      <style>{`
        @keyframes jemFloat { 0%,100%{ transform: translateY(0) rotate(-0.5deg);} 50%{ transform: translateY(-10px) rotate(0.5deg);} }
        @keyframes jemWave { from{ transform: translateX(0);} to{ transform: translateX(-50%);} }
      `}</style>
      <Waves />

      <form
        onSubmit={submit}
        style={{ position: 'relative', zIndex: 1, animation: pos ? 'none' : 'jemFloat 6s ease-in-out infinite', background: '#fff', border: '1px solid #e2e6e9', borderRadius: 10, width: 340, boxShadow: '0 8px 28px rgba(0,0,0,.14)', ...positioned }}
      >
        {/* شريط السحب */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          title="اسحب لتحريك المربع"
          style={{ cursor: 'move', padding: '10px 16px', borderBottom: '1px solid #eef0f1', display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}
        >
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="logo" style={{ height: 28, maxWidth: 120, objectFit: 'contain' }} />
          )}
          <span style={{ fontWeight: 700 }}>{appName || 'مراقب جيرا'}</span>
          <span style={{ marginInlineStart: 'auto', color: '#c2c9cf' }}>⠿</span>
        </div>

        <div style={{ padding: 22 }}>
          <p style={{ color: '#6b7785', fontSize: 13, marginTop: 0 }}>تسجيل الدخول للوحة الاستثناءات</p>

          <label style={lbl}>اسم المستخدم</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={needs2fa} style={inp} autoFocus />

          <label style={lbl}>كلمة المرور</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={needs2fa} style={inp} />

          {needs2fa && (
            <>
              <label style={lbl}>رمز التحقق (TOTP)</label>
              <input value={token} onChange={(e) => setToken(e.target.value)} inputMode="numeric" placeholder="123456" style={{ ...inp, letterSpacing: 4, textAlign: 'center' }} autoFocus />
            </>
          )}

          {error && <div style={{ color: '#e03636', fontSize: 13, margin: '8px 0' }}>{error}</div>}

          <button type="submit" disabled={busy} style={btn}>
            {busy ? '…' : needs2fa ? 'تأكيد' : 'دخول'}
          </button>
        </div>
      </form>
    </div>
  );
}

// أمواج بحر متحركة أسفل الشاشة (طبقتان بسرعات مختلفة) — SVG بلا مكتبات
function Waves() {
  // مسار يغطّي دورتين (period=1440) كي يلفّ بسلاسة عند translateX(-50%)
  const d = 'M0,70 C240,30 480,30 720,70 C960,110 1200,110 1440,70 C1680,30 1920,30 2160,70 C2400,110 2640,110 2880,70 L2880,140 L0,140 Z';
  const layer = (color, opacity, dur, height) => (
    <svg viewBox="0 0 2880 140" preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: 0, left: 0, width: '200%', height, animation: `jemWave ${dur}s linear infinite` }}>
      <path d={d} fill={color} opacity={opacity} />
    </svg>
  );
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160, pointerEvents: 'none', zIndex: 0 }}>
      {layer('#2490ef', 0.18, 18, 160)}
      {layer('#1f7a4d', 0.16, 12, 130)}
      {layer('#2490ef', 0.28, 8, 100)}
    </div>
  );
}

const lbl = { display: 'block', fontSize: 13, color: '#1f272e', margin: '12px 0 4px' };
const inp = { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e6e9', borderRadius: 6, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit' };
const btn = { width: '100%', marginTop: 18, background: '#1f7a4d', color: '#fff', border: 0, borderRadius: 6, padding: '10px', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
