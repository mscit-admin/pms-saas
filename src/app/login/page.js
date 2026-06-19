'use client';

import { useState } from 'react';

// صفحة تسجيل الدخول — خطوتان: كلمة المرور، ثم رمز TOTP إن كان مفعّلاً.
export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      if (!body.ok) {
        setError(body.error || 'تعذّر تسجيل الدخول');
        return;
      }
      if (body.data?.needs2fa) {
        setNeeds2fa(true);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('next') || '/';
    } catch {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f6' }}>
      <form
        onSubmit={submit}
        style={{ background: '#fff', border: '1px solid #e2e6e9', borderRadius: 10, padding: 28, width: 340, boxShadow: '0 2px 12px rgba(0,0,0,.05)' }}
      >
        <h1 style={{ fontSize: 20, margin: '0 0 4px' }}>مراقب جيرا</h1>
        <p style={{ color: '#6b7785', fontSize: 13, marginTop: 0 }}>تسجيل الدخول للوحة الاستثناءات</p>

        <label style={lbl}>اسم المستخدم</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} disabled={needs2fa} style={inp} autoFocus />

        <label style={lbl}>كلمة المرور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={needs2fa} style={inp} />

        {needs2fa && (
          <>
            <label style={lbl}>رمز التحقق (TOTP)</label>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              inputMode="numeric"
              placeholder="123456"
              style={{ ...inp, letterSpacing: 4, textAlign: 'center' }}
              autoFocus
            />
          </>
        )}

        {error && <div style={{ color: '#e03636', fontSize: 13, margin: '8px 0' }}>{error}</div>}

        <button type="submit" disabled={busy} style={btn}>
          {busy ? '…' : needs2fa ? 'تأكيد' : 'دخول'}
        </button>
      </form>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 13, color: '#1f272e', margin: '12px 0 4px' };
const inp = { width: '100%', boxSizing: 'border-box', border: '1px solid #e2e6e9', borderRadius: 6, padding: '9px 10px', fontSize: 14, fontFamily: 'inherit' };
const btn = { width: '100%', marginTop: 18, background: '#1f7a4d', color: '#fff', border: 0, borderRadius: 6, padding: '10px', fontSize: 15, fontWeight: 600, cursor: 'pointer' };
