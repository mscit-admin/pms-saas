'use client';

import { useEffect, useState, useCallback } from 'react';

// لوحة المشرف الأعلى — إضافة/إدارة المستأجرين: الحالة، الخطة، الحصص، الوحدات، الأدمن.
const PLANS = ['trial', 'basic', 'pro', 'enterprise'];

async function api(path, opts) {
  const res = await fetch(`/api/control${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const json = await res.json().catch(() => ({ ok: false, error: 'استجابة غير صالحة' }));
  if (!json.ok) throw new Error(json.error || 'خطأ');
  return json.data;
}

export default function ControlPanel() {
  const [me, setMe] = useState(null);
  const [featureKeys, setFeatureKeys] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const list = await api('/tenants');
      setTenants(list.items || []);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const info = await api('/me');
        setMe(info.admin); setFeatureKeys(info.featureKeys || []);
        await reload();
      } catch (e) {
        if (String(e.message).includes('المشرف')) window.location.href = '/control/login';
        else setError(e.message);
      }
    })();
  }, [reload]);

  async function logout() {
    await api('/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/control/login';
  }

  return (
    <div dir="rtl" style={S.page}>
      <header style={S.header}>
        <div style={S.brand}>لوحة المشرف الأعلى</div>
        <div style={S.headerRight}>
          {me && <span style={S.who}>{me.username}</span>}
          <button style={S.ghostBtn} onClick={logout}>خروج</button>
        </div>
      </header>

      {error && <div style={S.errorBar} onClick={() => setError('')}>{error} ✕</div>}

      <main style={S.main}>
        <AddTenant featureKeys={featureKeys} busy={busy} setBusy={setBusy}
          onDone={reload} onError={setError} />

        <h2 style={S.h2}>المستأجرون ({tenants.length})</h2>
        <div style={S.grid}>
          {tenants.map((t) => (
            <TenantCard key={t.slug} tenant={t} featureKeys={featureKeys}
              onChanged={reload} onError={setError} />
          ))}
          {!tenants.length && <div style={S.empty}>لا مستأجرين بعد — أضِف أوّل منظمة بالأعلى.</div>}
        </div>
      </main>
    </div>
  );
}

// ---- نموذج إضافة مستأجر ----
function AddTenant({ featureKeys, busy, setBusy, onDone, onError }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', slug: '', adminPassword: '', plan: 'trial', maxUsers: '', maxProjects: '' });
  const [features, setFeatures] = useState({});

  function set(k, v) { setF((s) => ({ ...s, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); onError('');
    try {
      const body = {
        name: f.name || f.slug,
        slug: f.slug,
        adminPassword: f.adminPassword,
        plan: f.plan,
        maxUsers: f.maxUsers === '' ? null : Number(f.maxUsers),
        maxProjects: f.maxProjects === '' ? null : Number(f.maxProjects),
        features: featureKeys.reduce((a, k) => ({ ...a, [k]: features[k] !== false }), {}),
      };
      await api('/tenants', { method: 'POST', body: JSON.stringify(body) });
      setF({ name: '', slug: '', adminPassword: '', plan: 'trial', maxUsers: '', maxProjects: '' });
      setFeatures({}); setOpen(false);
      await onDone();
    } catch (e2) { onError(e2.message); } finally { setBusy(false); }
  }

  if (!open) {
    return <button style={S.addBtn} onClick={() => setOpen(true)}>＋ إضافة مستأجر</button>;
  }

  return (
    <form onSubmit={submit} style={S.addCard}>
      <div style={S.addRow}>
        <Field label="اسم المنظمة"><input style={S.input} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Acme Inc" /></Field>
        <Field label="النطاق الفرعي (slug)"><input style={S.input} value={f.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="acme" required /></Field>
        <Field label="كلمة مرور الأدمن"><input style={S.input} type="text" value={f.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} placeholder="••••••" required /></Field>
      </div>
      <div style={S.addRow}>
        <Field label="الخطة"><select style={S.input} value={f.plan} onChange={(e) => set('plan', e.target.value)}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        <Field label="أقصى مستخدمين (فارغ = بلا حدّ)"><input style={S.input} type="number" min="1" value={f.maxUsers} onChange={(e) => set('maxUsers', e.target.value)} /></Field>
        <Field label="أقصى مشاريع (فارغ = بلا حدّ)"><input style={S.input} type="number" min="1" value={f.maxProjects} onChange={(e) => set('maxProjects', e.target.value)} /></Field>
      </div>
      <div style={S.featRow}>
        <span style={S.featLabel}>الوحدات:</span>
        {featureKeys.map((k) => (
          <label key={k} style={S.check}>
            <input type="checkbox" checked={features[k] !== false} onChange={(e) => setFeatures((s) => ({ ...s, [k]: e.target.checked }))} /> {k}
          </label>
        ))}
      </div>
      <div style={S.addActions}>
        <button style={S.primaryBtn} disabled={busy}>{busy ? '…' : 'إنشاء المستأجر'}</button>
        <button type="button" style={S.ghostBtn} onClick={() => setOpen(false)}>إلغاء</button>
      </div>
    </form>
  );
}

// ---- بطاقة مستأجر ----
function TenantCard({ tenant, featureKeys, onChanged, onError }) {
  const [t, setT] = useState(tenant);
  const [saving, setSaving] = useState(false);
  useEffect(() => setT(tenant), [tenant]);

  async function patch(body) {
    setSaving(true); onError('');
    try { await api(`/tenants/${t.slug}`, { method: 'PATCH', body: JSON.stringify(body) }); await onChanged(); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }
  async function saveLimits() {
    await patch({
      plan: t.plan,
      maxUsers: t.maxUsers === '' || t.maxUsers == null ? null : Number(t.maxUsers),
      maxProjects: t.maxProjects === '' || t.maxProjects == null ? null : Number(t.maxProjects),
      features: t.features,
    });
  }
  async function toggleStatus() {
    await patch({ status: t.status === 'active' ? 'suspended' : 'active' });
  }
  async function resetAdmin() {
    const pw = window.prompt(`كلمة مرور جديدة لأدمن «${t.slug}»:`);
    if (!pw) return;
    setSaving(true); onError('');
    try { await api(`/tenants/${t.slug}/admin`, { method: 'POST', body: JSON.stringify({ password: pw }) }); alert('تم تحديث كلمة مرور الأدمن.'); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }
  async function remove() {
    const c = window.prompt(`للحذف النهائي اكتب الـ slug: ${t.slug}`);
    if (c !== t.slug) return;
    setSaving(true); onError('');
    try { await api(`/tenants/${t.slug}`, { method: 'DELETE', body: JSON.stringify({ confirm: t.slug }) }); await onChanged(); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }

  const active = t.status === 'active';
  return (
    <div style={{ ...S.card, opacity: active ? 1 : 0.7 }}>
      <div style={S.cardHead}>
        <div>
          <span style={S.slug}>{t.slug}</span>
          <span style={{ ...S.badge, background: active ? '#16633a' : '#7a2230' }}>{active ? 'مفعّل' : 'معلّق'}</span>
        </div>
        <span style={S.name}>{t.name}</span>
      </div>
      <div style={S.meta}>قاعدة: {t.dbName}{t.stats ? ` · مستخدمون: ${t.stats.users ?? '—'} · مشاريع: ${t.stats.projects ?? '—'}` : ''}</div>

      <div style={S.row}>
        <Field label="الخطة"><select style={S.inputSm} value={t.plan} onChange={(e) => setT({ ...t, plan: e.target.value })}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        <Field label="أقصى مستخدمين"><input style={S.inputSm} type="number" value={t.maxUsers ?? ''} onChange={(e) => setT({ ...t, maxUsers: e.target.value })} placeholder="∞" /></Field>
        <Field label="أقصى مشاريع"><input style={S.inputSm} type="number" value={t.maxProjects ?? ''} onChange={(e) => setT({ ...t, maxProjects: e.target.value })} placeholder="∞" /></Field>
      </div>
      <div style={S.featRow}>
        {featureKeys.map((k) => (
          <label key={k} style={S.check}>
            <input type="checkbox" checked={t.features?.[k] !== false}
              onChange={(e) => setT({ ...t, features: { ...t.features, [k]: e.target.checked } })} /> {k}
          </label>
        ))}
      </div>
      <div style={S.cardActions}>
        <button style={S.primaryBtn} disabled={saving} onClick={saveLimits}>حفظ</button>
        <button style={S.ghostBtn} disabled={saving} onClick={toggleStatus}>{active ? 'تعليق' : 'تفعيل'}</button>
        <button style={S.ghostBtn} disabled={saving} onClick={resetAdmin}>كلمة مرور الأدمن</button>
        <button style={S.dangerBtn} disabled={saving} onClick={remove}>حذف</button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <label style={S.field}><span style={S.fieldLabel}>{label}</span>{children}</label>;
}

const S = {
  page: { minHeight: '100vh', background: '#0f141b', color: '#e8eef5', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid #2b3543', background: '#1a212b' },
  brand: { fontSize: 17, fontWeight: 700 },
  headerRight: { display: 'flex', gap: 12, alignItems: 'center' },
  who: { color: '#8da2b8', fontSize: 13 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '22px' },
  errorBar: { background: '#7a2230', color: '#fff', padding: '10px 22px', cursor: 'pointer', fontSize: 14 },
  h2: { fontSize: 16, margin: '22px 0 12px', color: '#cdd9e6' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 },
  empty: { color: '#8da2b8', padding: 20 },
  addBtn: { background: '#2f81f7', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 18px', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  addCard: { background: '#1a212b', border: '1px solid #2b3543', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 },
  addRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  addActions: { display: 'flex', gap: 10, marginTop: 4 },
  card: { background: '#1a212b', border: '1px solid #2b3543', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  slug: { fontSize: 16, fontWeight: 700, color: '#7cc4ff' },
  name: { fontSize: 13, color: '#8da2b8' },
  badge: { fontSize: 11, color: '#fff', borderRadius: 20, padding: '2px 9px', marginInlineStart: 8 },
  meta: { fontSize: 12, color: '#6b7e92' },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 },
  fieldLabel: { fontSize: 11, color: '#8da2b8' },
  input: { padding: '9px 11px', borderRadius: 8, border: '1px solid #2b3543', background: '#0f141b', color: '#e8eef5', fontSize: 14, outline: 'none', width: '100%' },
  inputSm: { padding: '7px 9px', borderRadius: 7, border: '1px solid #2b3543', background: '#0f141b', color: '#e8eef5', fontSize: 13, outline: 'none', width: '100%' },
  featRow: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  featLabel: { fontSize: 12, color: '#8da2b8' },
  check: { fontSize: 12, color: '#cdd9e6', display: 'flex', gap: 4, alignItems: 'center' },
  cardActions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  primaryBtn: { background: '#2f81f7', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  ghostBtn: { background: 'transparent', color: '#cdd9e6', border: '1px solid #2b3543', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  dangerBtn: { background: 'transparent', color: '#ff8087', border: '1px solid #5a2730', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
};
