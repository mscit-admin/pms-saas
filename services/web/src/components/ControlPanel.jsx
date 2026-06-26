'use client';

import { useEffect, useState, useCallback } from 'react';

// لوحة المشرف الأعلى (ثنائية اللغة) — إضافة/إدارة المستأجرين: الحالة، الخطة، الحصص، الوحدات، الأدمن.
const PLANS = ['trial', 'basic', 'pro', 'enterprise'];

// قاموس الترجمة عربي/إنجليزي
const T = {
  ar: {
    dir: 'rtl', other: 'English',
    brand: 'لوحة المشرف الأعلى', signout: 'خروج',
    tenants: 'المستأجرون', empty: 'لا مستأجرين بعد — أضِف أوّل منظمة بالأعلى.',
    add: '＋ إضافة مستأجر', orgName: 'اسم المنظمة', slug: 'النطاق الفرعي (slug)',
    adminPass: 'كلمة مرور الأدمن', plan: 'الخطة',
    maxUsers: 'أقصى مستخدمين (فارغ = بلا حدّ)', maxProjects: 'أقصى مشاريع (فارغ = بلا حدّ)',
    maxUsersShort: 'أقصى مستخدمين', maxProjectsShort: 'أقصى مشاريع',
    features: 'الوحدات:', create: 'إنشاء المستأجر', cancel: 'إلغاء',
    active: 'مفعّل', suspended: 'معلّق', db: 'قاعدة', usersLbl: 'مستخدمون', projectsLbl: 'مشاريع',
    save: 'حفظ', suspend: 'تعليق', activate: 'تفعيل', resetAdmin: 'كلمة مرور الأدمن', del: 'حذف',
    newPwFor: (s) => `كلمة مرور جديدة لأدمن «${s}»:`, pwUpdated: 'تم تحديث كلمة مرور الأدمن.',
    confirmDel: (s) => `للحذف النهائي اكتب الـ slug: ${s}`,
    invalidResp: 'استجابة غير صالحة', err: 'خطأ', needSuper: 'المشرف',
  },
  en: {
    dir: 'ltr', other: 'العربية',
    brand: 'Super-admin Console', signout: 'Sign out',
    tenants: 'Tenants', empty: 'No tenants yet — add your first one above.',
    add: '＋ Add tenant', orgName: 'Organization name', slug: 'Subdomain (slug)',
    adminPass: 'Admin password', plan: 'Plan',
    maxUsers: 'Max users (empty = unlimited)', maxProjects: 'Max projects (empty = unlimited)',
    maxUsersShort: 'Max users', maxProjectsShort: 'Max projects',
    features: 'Features:', create: 'Create tenant', cancel: 'Cancel',
    active: 'Active', suspended: 'Suspended', db: 'DB', usersLbl: 'Users', projectsLbl: 'Projects',
    save: 'Save', suspend: 'Suspend', activate: 'Activate', resetAdmin: 'Admin password', del: 'Delete',
    newPwFor: (s) => `New password for "${s}" admin:`, pwUpdated: 'Admin password updated.',
    confirmDel: (s) => `To permanently delete, type the slug: ${s}`,
    invalidResp: 'Invalid response', err: 'Error', needSuper: 'admin',
  },
};

async function api(path, opts, t) {
  const res = await fetch(`/api/control${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const json = await res.json().catch(() => ({ ok: false, error: t.invalidResp }));
  if (!json.ok) throw new Error(json.error || t.err);
  return json.data;
}

export default function ControlPanel() {
  const [lang, setLang] = useState('ar');
  const [me, setMe] = useState(null);
  const [featureKeys, setFeatureKeys] = useState([]);
  const [tenants, setTenants] = useState([]);
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

  const reload = useCallback(async () => {
    try { const list = await api('/tenants', undefined, T[lang]); setTenants(list.items || []); }
    catch (e) { setError(e.message); }
  }, [lang]);

  useEffect(() => {
    (async () => {
      try {
        const info = await api('/me', undefined, T.ar);
        setMe(info.admin); setFeatureKeys(info.featureKeys || []);
        await reload();
      } catch (e) {
        if (/المشرف|admin/.test(String(e.message))) window.location.href = '/control/login';
        else setError(e.message);
      }
    })();
  }, [reload]);

  async function logout() {
    await api('/logout', { method: 'POST' }, t).catch(() => {});
    window.location.href = '/control/login';
  }

  return (
    <div dir={t.dir} style={S.page}>
      <header style={S.header}>
        <div style={S.brand}>{t.brand}</div>
        <div style={S.headerRight}>
          <button style={S.ghostBtn} onClick={toggleLang}>{t.other}</button>
          {me && <span style={S.who}>{me.username}</span>}
          <button style={S.ghostBtn} onClick={logout}>{t.signout}</button>
        </div>
      </header>

      {error && <div style={S.errorBar} onClick={() => setError('')}>{error} ✕</div>}

      <main style={S.main}>
        <AddTenant t={t} featureKeys={featureKeys} busy={busy} setBusy={setBusy}
          onDone={reload} onError={setError} />

        <h2 style={S.h2}>{t.tenants} ({tenants.length})</h2>
        <div style={S.grid}>
          {tenants.map((tn) => (
            <TenantCard key={tn.slug} t={t} tenant={tn} featureKeys={featureKeys}
              onChanged={reload} onError={setError} />
          ))}
          {!tenants.length && <div style={S.empty}>{t.empty}</div>}
        </div>
      </main>
    </div>
  );
}

// ---- نموذج إضافة مستأجر ----
function AddTenant({ t, featureKeys, busy, setBusy, onDone, onError }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', slug: '', adminPassword: '', plan: 'trial', maxUsers: '', maxProjects: '' });
  const [features, setFeatures] = useState({});
  function set(k, v) { setF((s) => ({ ...s, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); onError('');
    try {
      const body = {
        name: f.name || f.slug, slug: f.slug, adminPassword: f.adminPassword, plan: f.plan,
        maxUsers: f.maxUsers === '' ? null : Number(f.maxUsers),
        maxProjects: f.maxProjects === '' ? null : Number(f.maxProjects),
        features: featureKeys.reduce((a, k) => ({ ...a, [k]: features[k] !== false }), {}),
      };
      await api('/tenants', { method: 'POST', body: JSON.stringify(body) }, t);
      setF({ name: '', slug: '', adminPassword: '', plan: 'trial', maxUsers: '', maxProjects: '' });
      setFeatures({}); setOpen(false);
      await onDone();
    } catch (e2) { onError(e2.message); } finally { setBusy(false); }
  }

  if (!open) return <button style={S.addBtn} onClick={() => setOpen(true)}>{t.add}</button>;

  return (
    <form onSubmit={submit} style={S.addCard}>
      <div style={S.addRow}>
        <Field label={t.orgName}><input style={S.input} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Acme Inc" /></Field>
        <Field label={t.slug}><input style={S.input} value={f.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="acme" required /></Field>
        <Field label={t.adminPass}><input style={S.input} type="text" value={f.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} placeholder="••••••" required /></Field>
      </div>
      <div style={S.addRow}>
        <Field label={t.plan}><select style={S.input} value={f.plan} onChange={(e) => set('plan', e.target.value)}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        <Field label={t.maxUsers}><input style={S.input} type="number" min="1" value={f.maxUsers} onChange={(e) => set('maxUsers', e.target.value)} /></Field>
        <Field label={t.maxProjects}><input style={S.input} type="number" min="1" value={f.maxProjects} onChange={(e) => set('maxProjects', e.target.value)} /></Field>
      </div>
      <div style={S.featRow}>
        <span style={S.featLabel}>{t.features}</span>
        {featureKeys.map((k) => (
          <label key={k} style={S.check}>
            <input type="checkbox" checked={features[k] !== false} onChange={(e) => setFeatures((s) => ({ ...s, [k]: e.target.checked }))} /> {k}
          </label>
        ))}
      </div>
      <div style={S.addActions}>
        <button style={S.primaryBtn} disabled={busy}>{busy ? '…' : t.create}</button>
        <button type="button" style={S.ghostBtn} onClick={() => setOpen(false)}>{t.cancel}</button>
      </div>
    </form>
  );
}

// ---- بطاقة مستأجر ----
function TenantCard({ t, tenant, featureKeys, onChanged, onError }) {
  const [tn, setTn] = useState(tenant);
  const [saving, setSaving] = useState(false);
  useEffect(() => setTn(tenant), [tenant]);

  async function patch(body) {
    setSaving(true); onError('');
    try { await api(`/tenants/${tn.slug}`, { method: 'PATCH', body: JSON.stringify(body) }, t); await onChanged(); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }
  async function saveLimits() {
    await patch({
      plan: tn.plan,
      maxUsers: tn.maxUsers === '' || tn.maxUsers == null ? null : Number(tn.maxUsers),
      maxProjects: tn.maxProjects === '' || tn.maxProjects == null ? null : Number(tn.maxProjects),
      features: tn.features,
    });
  }
  async function toggleStatus() { await patch({ status: tn.status === 'active' ? 'suspended' : 'active' }); }
  async function resetAdmin() {
    const pw = window.prompt(t.newPwFor(tn.slug));
    if (!pw) return;
    setSaving(true); onError('');
    try { await api(`/tenants/${tn.slug}/admin`, { method: 'POST', body: JSON.stringify({ password: pw }) }, t); alert(t.pwUpdated); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }
  async function remove() {
    const c = window.prompt(t.confirmDel(tn.slug));
    if (c !== tn.slug) return;
    setSaving(true); onError('');
    try { await api(`/tenants/${tn.slug}`, { method: 'DELETE', body: JSON.stringify({ confirm: tn.slug }) }, t); await onChanged(); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }

  const active = tn.status === 'active';
  return (
    <div style={{ ...S.card, opacity: active ? 1 : 0.7 }}>
      <div style={S.cardHead}>
        <div>
          <span style={S.slug}>{tn.slug}</span>
          <span style={{ ...S.badge, background: active ? '#16633a' : '#7a2230' }}>{active ? t.active : t.suspended}</span>
        </div>
        <span style={S.name}>{tn.name}</span>
      </div>
      <div style={S.meta}>{t.db}: {tn.dbName}{tn.stats ? ` · ${t.usersLbl}: ${tn.stats.users ?? '—'} · ${t.projectsLbl}: ${tn.stats.projects ?? '—'}` : ''}</div>

      <div style={S.row}>
        <Field label={t.plan}><select style={S.inputSm} value={tn.plan} onChange={(e) => setTn({ ...tn, plan: e.target.value })}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        <Field label={t.maxUsersShort}><input style={S.inputSm} type="number" value={tn.maxUsers ?? ''} onChange={(e) => setTn({ ...tn, maxUsers: e.target.value })} placeholder="∞" /></Field>
        <Field label={t.maxProjectsShort}><input style={S.inputSm} type="number" value={tn.maxProjects ?? ''} onChange={(e) => setTn({ ...tn, maxProjects: e.target.value })} placeholder="∞" /></Field>
      </div>
      <div style={S.featRow}>
        {featureKeys.map((k) => (
          <label key={k} style={S.check}>
            <input type="checkbox" checked={tn.features?.[k] !== false}
              onChange={(e) => setTn({ ...tn, features: { ...tn.features, [k]: e.target.checked } })} /> {k}
          </label>
        ))}
      </div>
      <div style={S.cardActions}>
        <button style={S.primaryBtn} disabled={saving} onClick={saveLimits}>{t.save}</button>
        <button style={S.ghostBtn} disabled={saving} onClick={toggleStatus}>{active ? t.suspend : t.activate}</button>
        <button style={S.ghostBtn} disabled={saving} onClick={resetAdmin}>{t.resetAdmin}</button>
        <button style={S.dangerBtn} disabled={saving} onClick={remove}>{t.del}</button>
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
