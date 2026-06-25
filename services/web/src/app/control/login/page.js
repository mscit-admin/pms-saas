'use client';

import { useState } from 'react';

// دخول المشرف الأعلى — صفحة بسيطة منفصلة عن دخول المستأجرين.
export default function ControlLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      if (!json.ok) { setError(json.error || 'فشل الدخول'); return; }
      window.location.href = '/control';
    } catch {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div dir="rtl" style={S.wrap}>
      <form onSubmit={submit} style={S.card}>
        <h1 style={S.title}>لوحة المشرف الأعلى</h1>
        <p style={S.sub}>إدارة المستأجرين والمنصّة</p>
        <input style={S.input} placeholder="اسم المستخدم" value={username}
          onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input style={S.input} type="password" placeholder="كلمة المرور" value={password}
          onChange={(e) => setPassword(e.target.value)} />
        {error && <div style={S.error}>{error}</div>}
        <button style={S.btn} disabled={busy}>{busy ? '…' : 'دخول'}</button>
      </form>
    </div>
  );
}

const S = {
  wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0f141b', fontFamily: 'system-ui, sans-serif' },
  card: { width: 340, background: '#1a212b', border: '1px solid #2b3543', borderRadius: 14, padding: 28, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 10px 40px rgba(0,0,0,.4)' },
  title: { color: '#e8eef5', margin: 0, fontSize: 20, textAlign: 'center' },
  sub: { color: '#8da2b8', margin: '0 0 8px', fontSize: 13, textAlign: 'center' },
  input: { padding: '11px 13px', borderRadius: 9, border: '1px solid #2b3543', background: '#0f141b', color: '#e8eef5', fontSize: 14, outline: 'none' },
  btn: { padding: '11px', borderRadius: 9, border: 'none', background: '#2f81f7', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  error: { color: '#ff6b6b', fontSize: 13, textAlign: 'center' },
};
