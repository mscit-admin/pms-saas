'use client';

import { useEffect, useState, useCallback } from 'react';

// لوحة المشرف الأعلى — قائمة جانبية: لوحة المعلومات · العملاء · الإعدادات.
// ثنائية اللغة (عربي/إنجليزي) + وضع فاتح/داكن، والأقسام محكومة بالصلاحيات.
const PLANS = ['trial', 'basic', 'pro', 'enterprise'];

const T = {
  ar: {
    dir: 'rtl', other: 'English', signout: 'خروج',
    nav: { dashboard: 'لوحة المعلومات', clients: 'العملاء', settings: 'الإعدادات' },
    dash: { tenants: 'إجمالي العملاء', active: 'مفعّل', suspended: 'معلّق', users: 'إجمالي المستخدمين', projects: 'إجمالي المشاريع', byPlan: 'حسب الخطة' },
    add: '＋ إضافة عميل', orgName: 'اسم المنظمة', slug: 'النطاق الفرعي (slug)', adminPass: 'كلمة مرور الأدمن',
    plan: 'الخطة', maxUsers: 'أقصى مستخدمين (فارغ = بلا حدّ)', maxProjects: 'أقصى مشاريع (فارغ = بلا حدّ)',
    maxUsersShort: 'أقصى مستخدمين', maxProjectsShort: 'أقصى مشاريع', features: 'الوحدات:',
    create: 'إنشاء', cancel: 'إلغاء', save: 'حفظ', suspend: 'تعليق', activate: 'تفعيل',
    resetAdmin: 'كلمة مرور الأدمن', del: 'حذف', manage: 'إدارة',
    activeLbl: 'مفعّل', suspendedLbl: 'معلّق', db: 'قاعدة', usersLbl: 'مستخدمون', projectsLbl: 'مشاريع',
    newPwFor: (s) => `كلمة مرور جديدة لأدمن «${s}»:`, pwUpdated: 'تم تحديث كلمة مرور الأدمن.',
    confirmDel: (s) => `للحذف النهائي اكتب الـ slug: ${s}`,
    tabs: { branding: 'الهوية البصرية', admins: 'المشرفون', perms: 'الصلاحيات' },
    platformName: 'اسم المنصّة', accent: 'اللون الأساسي', logoUrl: 'رابط الشعار', saved: 'تم الحفظ ✓',
    addAdmin: '＋ إضافة مشرف', username: 'اسم المستخدم', password: 'كلمة المرور', fullName: 'الاسم الكامل',
    deactivate: 'تعطيل', adminActive: 'مفعّل', adminInactive: 'معطّل', savePerms: 'حفظ الصلاحيات',
    mUsers: 'المستخدمون', mRoles: 'الأدوار', addUser: '＋ مستخدم', addRole: '＋ دور',
    roleName: 'اسم الدور', email: 'البريد', noUsers: 'لا مستخدمين', noRoles: 'لا أدوار',
    invalidResp: 'استجابة غير صالحة', err: 'خطأ', noAccess: 'لا توجد لديك صلاحية لأي قسم.',
  },
  en: {
    dir: 'ltr', other: 'العربية', signout: 'Sign out',
    nav: { dashboard: 'Dashboard', clients: 'Clients', settings: 'Settings' },
    dash: { tenants: 'Total clients', active: 'Active', suspended: 'Suspended', users: 'Total users', projects: 'Total projects', byPlan: 'By plan' },
    add: '＋ Add client', orgName: 'Organization name', slug: 'Subdomain (slug)', adminPass: 'Admin password',
    plan: 'Plan', maxUsers: 'Max users (empty = unlimited)', maxProjects: 'Max projects (empty = unlimited)',
    maxUsersShort: 'Max users', maxProjectsShort: 'Max projects', features: 'Features:',
    create: 'Create', cancel: 'Cancel', save: 'Save', suspend: 'Suspend', activate: 'Activate',
    resetAdmin: 'Admin password', del: 'Delete', manage: 'Manage',
    activeLbl: 'Active', suspendedLbl: 'Suspended', db: 'DB', usersLbl: 'Users', projectsLbl: 'Projects',
    newPwFor: (s) => `New password for "${s}" admin:`, pwUpdated: 'Admin password updated.',
    confirmDel: (s) => `To permanently delete, type the slug: ${s}`,
    tabs: { branding: 'Branding', admins: 'Admins', perms: 'Permissions' },
    platformName: 'Platform name', accent: 'Accent color', logoUrl: 'Logo URL', saved: 'Saved ✓',
    addAdmin: '＋ Add admin', username: 'Username', password: 'Password', fullName: 'Full name',
    deactivate: 'Deactivate', adminActive: 'Active', adminInactive: 'Disabled', savePerms: 'Save permissions',
    mUsers: 'Users', mRoles: 'Roles', addUser: '＋ User', addRole: '＋ Role',
    roleName: 'Role name', email: 'Email', noUsers: 'No users', noRoles: 'No roles',
    invalidResp: 'Invalid response', err: 'Error', noAccess: 'You have no access to any section.',
  },
};

const THEME_VARS = {
  dark: { '--c-bg': '#0f141b', '--c-panel': '#1a212b', '--c-side': '#141b24', '--c-border': '#2b3543', '--c-text': '#e8eef5', '--c-muted': '#8da2b8', '--c-input': '#0f141b', '--c-accent': '#2f81f7', '--c-slug': '#7cc4ff', '--c-hover': '#202a36' },
  light: { '--c-bg': '#f4f6f9', '--c-panel': '#ffffff', '--c-side': '#ffffff', '--c-border': '#d8dee6', '--c-text': '#1b2430', '--c-muted': '#5c6b7a', '--c-input': '#ffffff', '--c-accent': '#2f81f7', '--c-slug': '#1769d6', '--c-hover': '#eef2f7' },
};

async function api(path, opts, t) {
  const res = await fetch(`/api/control${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const json = await res.json().catch(() => ({ ok: false, error: t.invalidResp }));
  if (!json.ok) throw new Error(json.error || t.err);
  return json.data;
}

export default function ControlPanel() {
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('dark');
  const [me, setMe] = useState(null);
  const [featureKeys, setFeatureKeys] = useState([]);
  const [ctrlPerms, setCtrlPerms] = useState([]);
  const [view, setView] = useState('dashboard');
  const [error, setError] = useState('');
  const t = T[lang];

  useEffect(() => {
    const sl = localStorage.getItem('controlLang'); if (sl === 'ar' || sl === 'en') setLang(sl);
    const th = localStorage.getItem('controlTheme'); if (th === 'light' || th === 'dark') setTheme(th);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const info = await api('/me', undefined, T.ar);
        setMe(info.admin); setFeatureKeys(info.featureKeys || []); setCtrlPerms(info.controlPermissions || []);
        const p = info.admin.permissions || [];
        const first = p.includes('view_dashboard') ? 'dashboard'
          : p.includes('manage_tenants') ? 'clients'
          : (p.includes('manage_admins') || p.includes('manage_branding')) ? 'settings' : 'none';
        setView(first);
      } catch (e) {
        if (/المشرف|admin/.test(String(e.message))) window.location.href = '/control/login';
        else setError(e.message);
      }
    })();
  }, []);

  function toggleLang() { const n = lang === 'ar' ? 'en' : 'ar'; setLang(n); localStorage.setItem('controlLang', n); }
  function toggleTheme() { const n = theme === 'dark' ? 'light' : 'dark'; setTheme(n); localStorage.setItem('controlTheme', n); }
  async function logout() { await api('/logout', { method: 'POST' }, t).catch(() => {}); window.location.href = '/control/login'; }

  const can = (k) => me?.permissions?.includes(k);
  const items = [
    { key: 'dashboard', label: t.nav.dashboard, icon: '▤', show: can('view_dashboard') },
    { key: 'clients', label: t.nav.clients, icon: '◴', show: can('manage_tenants') },
    { key: 'settings', label: t.nav.settings, icon: '⚙', show: can('manage_admins') || can('manage_branding') },
  ].filter((i) => i.show);

  return (
    <div dir={t.dir} style={{ ...THEME_VARS[theme], ...S.app }}>
      <aside style={S.sidebar}>
        <div style={S.logo}>PMS</div>
        <nav style={S.nav}>
          {items.map((i) => (
            <button key={i.key} onClick={() => setView(i.key)}
              style={{ ...S.navItem, ...(view === i.key ? S.navActive : {}) }}>
              <span style={S.navIcon}>{i.icon}</span> {i.label}
            </button>
          ))}
        </nav>
        <div style={S.sideFoot}>
          <button style={S.iconBtn} onClick={toggleTheme} title="theme">{theme === 'dark' ? '☀' : '☾'}</button>
          <button style={S.iconBtn} onClick={toggleLang}>{t.other}</button>
        </div>
      </aside>

      <div style={S.content}>
        <header style={S.topbar}>
          <strong>{items.find((i) => i.key === view)?.label || ''}</strong>
          <div style={S.topRight}>
            {me && <span style={S.who}>{me.username}</span>}
            <button style={S.ghostBtn} onClick={logout}>{t.signout}</button>
          </div>
        </header>

        {error && <div style={S.errorBar} onClick={() => setError('')}>{error} ✕</div>}

        <main style={S.main}>
          {view === 'none' && <div style={S.empty}>{t.noAccess}</div>}
          {view === 'dashboard' && <DashboardView t={t} onError={setError} />}
          {view === 'clients' && <ClientsView t={t} featureKeys={featureKeys} onError={setError} />}
          {view === 'settings' && <SettingsView t={t} can={can} ctrlPerms={ctrlPerms} meId={me?.id} onError={setError} />}
        </main>
      </div>
    </div>
  );
}

// ============ لوحة المعلومات ============
function DashboardView({ t, onError }) {
  const [s, setS] = useState(null);
  useEffect(() => { api('/stats', undefined, t).then(setS).catch((e) => onError(e.message)); }, []); // eslint-disable-line
  if (!s) return <div style={S.empty}>…</div>;
  const cards = [
    { label: t.dash.tenants, value: s.total },
    { label: t.dash.active, value: s.byStatus?.active || 0 },
    { label: t.dash.suspended, value: s.byStatus?.suspended || 0 },
    { label: t.dash.users, value: s.users },
    { label: t.dash.projects, value: s.projects },
  ];
  return (
    <>
      <div style={S.statGrid}>
        {cards.map((c) => (
          <div key={c.label} style={S.statCard}><div style={S.statVal}>{c.value}</div><div style={S.statLbl}>{c.label}</div></div>
        ))}
      </div>
      <h3 style={S.h3}>{t.dash.byPlan}</h3>
      <div style={S.planRow}>
        {Object.entries(s.byPlan || {}).map(([p, n]) => (
          <span key={p} style={S.planChip}>{p}: <b>{n}</b></span>
        ))}
      </div>
    </>
  );
}

// ============ العملاء (المستأجرون) ============
function ClientsView({ t, featureKeys, onError }) {
  const [tenants, setTenants] = useState([]);
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    try { const list = await api('/tenants', undefined, t); setTenants(list.items || []); }
    catch (e) { onError(e.message); }
  }, [t, onError]);
  useEffect(() => { reload(); }, [reload]);
  return (
    <>
      <AddTenant t={t} featureKeys={featureKeys} busy={busy} setBusy={setBusy} onDone={reload} onError={onError} />
      <div style={S.grid}>
        {tenants.map((tn) => <TenantCard key={tn.slug} t={t} tenant={tn} featureKeys={featureKeys} onChanged={reload} onError={onError} />)}
        {!tenants.length && <div style={S.empty}>—</div>}
      </div>
    </>
  );
}

function AddTenant({ t, featureKeys, busy, setBusy, onDone, onError }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', slug: '', adminPassword: '', plan: 'trial', maxUsers: '', maxProjects: '' });
  const [features, setFeatures] = useState({});
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); onError('');
    try {
      await api('/tenants', { method: 'POST', body: JSON.stringify({
        name: f.name || f.slug, slug: f.slug, adminPassword: f.adminPassword, plan: f.plan,
        maxUsers: f.maxUsers === '' ? null : Number(f.maxUsers),
        maxProjects: f.maxProjects === '' ? null : Number(f.maxProjects),
        features: featureKeys.reduce((a, k) => ({ ...a, [k]: features[k] !== false }), {}),
      }) }, t);
      setF({ name: '', slug: '', adminPassword: '', plan: 'trial', maxUsers: '', maxProjects: '' });
      setFeatures({}); setOpen(false); await onDone();
    } catch (e2) { onError(e2.message); } finally { setBusy(false); }
  }
  if (!open) return <button style={S.addBtn} onClick={() => setOpen(true)}>{t.add}</button>;
  return (
    <form onSubmit={submit} style={S.addCard}>
      <div style={S.addRow}>
        <Field label={t.orgName}><input style={S.input} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Acme Inc" /></Field>
        <Field label={t.slug}><input style={S.input} value={f.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="acme" required /></Field>
        <Field label={t.adminPass}><input style={S.input} value={f.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} placeholder="••••••" required /></Field>
      </div>
      <div style={S.addRow}>
        <Field label={t.plan}><select style={S.input} value={f.plan} onChange={(e) => set('plan', e.target.value)}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        <Field label={t.maxUsers}><input style={S.input} type="number" min="1" value={f.maxUsers} onChange={(e) => set('maxUsers', e.target.value)} /></Field>
        <Field label={t.maxProjects}><input style={S.input} type="number" min="1" value={f.maxProjects} onChange={(e) => set('maxProjects', e.target.value)} /></Field>
      </div>
      <div style={S.featRow}>
        <span style={S.featLabel}>{t.features}</span>
        {featureKeys.map((k) => <label key={k} style={S.check}><input type="checkbox" checked={features[k] !== false} onChange={(e) => setFeatures((s) => ({ ...s, [k]: e.target.checked }))} /> {k}</label>)}
      </div>
      <div style={S.addActions}>
        <button style={S.primaryBtn} disabled={busy}>{busy ? '…' : t.create}</button>
        <button type="button" style={S.ghostBtn} onClick={() => setOpen(false)}>{t.cancel}</button>
      </div>
    </form>
  );
}

function TenantCard({ t, tenant, featureKeys, onChanged, onError }) {
  const [tn, setTn] = useState(tenant);
  const [saving, setSaving] = useState(false);
  const [managing, setManaging] = useState(false);
  useEffect(() => setTn(tenant), [tenant]);
  async function patch(body) {
    setSaving(true); onError('');
    try { await api(`/tenants/${tn.slug}`, { method: 'PATCH', body: JSON.stringify(body) }, t); await onChanged(); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }
  const saveLimits = () => patch({ plan: tn.plan, maxUsers: tn.maxUsers === '' || tn.maxUsers == null ? null : Number(tn.maxUsers), maxProjects: tn.maxProjects === '' || tn.maxProjects == null ? null : Number(tn.maxProjects), features: tn.features });
  const toggleStatus = () => patch({ status: tn.status === 'active' ? 'suspended' : 'active' });
  async function resetAdmin() {
    const pw = window.prompt(t.newPwFor(tn.slug)); if (!pw) return;
    setSaving(true); onError('');
    try { await api(`/tenants/${tn.slug}/admin`, { method: 'POST', body: JSON.stringify({ password: pw }) }, t); alert(t.pwUpdated); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }
  async function remove() {
    const c = window.prompt(t.confirmDel(tn.slug)); if (c !== tn.slug) return;
    setSaving(true); onError('');
    try { await api(`/tenants/${tn.slug}`, { method: 'DELETE', body: JSON.stringify({ confirm: tn.slug }) }, t); await onChanged(); }
    catch (e) { onError(e.message); } finally { setSaving(false); }
  }
  const active = tn.status === 'active';
  return (
    <div style={{ ...S.card, opacity: active ? 1 : 0.7 }}>
      <div style={S.cardHead}>
        <div><span style={S.slug}>{tn.slug}</span><span style={{ ...S.badge, background: active ? '#16633a' : '#7a2230' }}>{active ? t.activeLbl : t.suspendedLbl}</span></div>
        <span style={S.name}>{tn.name}</span>
      </div>
      <div style={S.meta}>{t.db}: {tn.dbName}{tn.stats ? ` · ${t.usersLbl}: ${tn.stats.users ?? '—'} · ${t.projectsLbl}: ${tn.stats.projects ?? '—'}` : ''}</div>
      <div style={S.row}>
        <Field label={t.plan}><select style={S.inputSm} value={tn.plan} onChange={(e) => setTn({ ...tn, plan: e.target.value })}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        <Field label={t.maxUsersShort}><input style={S.inputSm} type="number" value={tn.maxUsers ?? ''} onChange={(e) => setTn({ ...tn, maxUsers: e.target.value })} placeholder="∞" /></Field>
        <Field label={t.maxProjectsShort}><input style={S.inputSm} type="number" value={tn.maxProjects ?? ''} onChange={(e) => setTn({ ...tn, maxProjects: e.target.value })} placeholder="∞" /></Field>
      </div>
      <div style={S.featRow}>
        {featureKeys.map((k) => <label key={k} style={S.check}><input type="checkbox" checked={tn.features?.[k] !== false} onChange={(e) => setTn({ ...tn, features: { ...tn.features, [k]: e.target.checked } })} /> {k}</label>)}
      </div>
      <div style={S.cardActions}>
        <button style={S.primaryBtn} disabled={saving} onClick={saveLimits}>{t.save}</button>
        <button style={S.ghostBtn} disabled={saving} onClick={toggleStatus}>{active ? t.suspend : t.activate}</button>
        <button style={S.ghostBtn} disabled={saving} onClick={() => setManaging((m) => !m)}>{t.manage}</button>
        <button style={S.ghostBtn} disabled={saving} onClick={resetAdmin}>{t.resetAdmin}</button>
        <button style={S.dangerBtn} disabled={saving} onClick={remove}>{t.del}</button>
      </div>
      {managing && <ManageTenant t={t} slug={tn.slug} onError={onError} />}
    </div>
  );
}

// إدارة مركزية لمستأجر: مستخدمون + أدوار (داخل قاعدته).
function ManageTenant({ t, slug, onError }) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [uf, setUf] = useState({ username: '', email: '', password: '', roleIds: [] });
  const [rf, setRf] = useState({ name: '', permissions: [] });
  const loadUsers = useCallback(async () => { try { const d = await api(`/tenants/${slug}/users`, undefined, t); setUsers(d.items || []); } catch (e) { onError(e.message); } }, [slug, t, onError]);
  const loadRoles = useCallback(async () => { try { const d = await api(`/tenants/${slug}/roles`, undefined, t); setRoles(d.items || []); setCatalog(d.catalog || []); } catch (e) { onError(e.message); } }, [slug, t, onError]);
  useEffect(() => { loadUsers(); loadRoles(); }, [loadUsers, loadRoles]);

  async function addUser(e) {
    e.preventDefault(); onError('');
    try {
      await api(`/tenants/${slug}/users`, { method: 'POST', body: JSON.stringify({ ...uf, roleIds: uf.roleIds.map(Number) }) }, t);
      setUf({ username: '', email: '', password: '', roleIds: [] }); await loadUsers();
    } catch (e2) { onError(e2.message); }
  }
  async function addRole(e) {
    e.preventDefault(); onError('');
    try { await api(`/tenants/${slug}/roles`, { method: 'POST', body: JSON.stringify(rf) }, t); setRf({ name: '', permissions: [] }); await loadRoles(); }
    catch (e2) { onError(e2.message); }
  }

  return (
    <div style={S.manageBox}>
      <div style={S.subTabs}>
        <button style={{ ...S.subTab, ...(tab === 'users' ? S.subTabOn : {}) }} onClick={() => setTab('users')}>{t.mUsers}</button>
        <button style={{ ...S.subTab, ...(tab === 'roles' ? S.subTabOn : {}) }} onClick={() => setTab('roles')}>{t.mRoles}</button>
      </div>
      {tab === 'users' && (
        <>
          <form onSubmit={addUser} style={S.inlineForm}>
            <input style={S.inputSm} placeholder={t.username} value={uf.username} onChange={(e) => setUf({ ...uf, username: e.target.value })} required />
            <input style={S.inputSm} placeholder={t.email} value={uf.email} onChange={(e) => setUf({ ...uf, email: e.target.value })} />
            <input style={S.inputSm} placeholder={t.password} value={uf.password} onChange={(e) => setUf({ ...uf, password: e.target.value })} required />
            <select multiple style={{ ...S.inputSm, minHeight: 30 }} value={uf.roleIds.map(String)} onChange={(e) => setUf({ ...uf, roleIds: Array.from(e.target.selectedOptions, (o) => o.value) })}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button style={S.primaryBtn}>{t.addUser}</button>
          </form>
          <div style={S.list}>{users.length ? users.map((u) => <div key={u.id} style={S.listItem}>{u.username} <span style={S.muted}>{(u.roles || []).map((r) => r.name).join(', ')}</span></div>) : <div style={S.muted}>{t.noUsers}</div>}</div>
        </>
      )}
      {tab === 'roles' && (
        <>
          <form onSubmit={addRole} style={S.inlineForm}>
            <input style={S.inputSm} placeholder={t.roleName} value={rf.name} onChange={(e) => setRf({ ...rf, name: e.target.value })} required />
            <button style={S.primaryBtn}>{t.addRole}</button>
          </form>
          <div style={S.permGrid}>
            {catalog.map((p) => (
              <label key={p.key} style={S.check}>
                <input type="checkbox" checked={rf.permissions.includes(p.key)}
                  onChange={(e) => setRf((s) => ({ ...s, permissions: e.target.checked ? [...s.permissions, p.key] : s.permissions.filter((k) => k !== p.key) }))} /> {p.label || p.key}
              </label>
            ))}
          </div>
          <div style={S.list}>{roles.length ? roles.map((r) => <div key={r.id} style={S.listItem}>{r.name} <span style={S.muted}>{r.description || ''}</span></div>) : <div style={S.muted}>{t.noRoles}</div>}</div>
        </>
      )}
    </div>
  );
}

// ============ الإعدادات ============
function SettingsView({ t, can, ctrlPerms, meId, onError }) {
  const tabs = [
    can('manage_branding') && { key: 'branding', label: t.tabs.branding },
    can('manage_admins') && { key: 'admins', label: t.tabs.admins },
    can('manage_admins') && { key: 'perms', label: t.tabs.perms },
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0]?.key || 'branding');
  return (
    <>
      <div style={S.tabBar}>{tabs.map((x) => <button key={x.key} style={{ ...S.tab, ...(tab === x.key ? S.tabOn : {}) }} onClick={() => setTab(x.key)}>{x.label}</button>)}</div>
      {tab === 'branding' && <BrandingTab t={t} onError={onError} />}
      {(tab === 'admins' || tab === 'perms') && <AdminsTab t={t} ctrlPerms={ctrlPerms} meId={meId} permsMode={tab === 'perms'} onError={onError} />}
    </>
  );
}

function BrandingTab({ t, onError }) {
  const [s, setS2] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api('/settings', undefined, t).then(setS2).catch((e) => onError(e.message)); }, []); // eslint-disable-line
  if (!s) return <div style={S.empty}>…</div>;
  async function save(e) {
    e.preventDefault(); onError(''); setSaved(false);
    try { const d = await api('/settings', { method: 'PUT', body: JSON.stringify(s) }, t); setS2(d); setSaved(true); }
    catch (e2) { onError(e2.message); }
  }
  return (
    <form onSubmit={save} style={S.formCol}>
      <Field label={t.platformName}><input style={S.input} value={s.platformName} onChange={(e) => setS2({ ...s, platformName: e.target.value })} /></Field>
      <Field label={t.accent}><input style={{ ...S.input, height: 40 }} type="color" value={s.accent || '#2f81f7'} onChange={(e) => setS2({ ...s, accent: e.target.value })} /></Field>
      <Field label={t.logoUrl}><input style={S.input} value={s.logoUrl} onChange={(e) => setS2({ ...s, logoUrl: e.target.value })} placeholder="https://…/logo.png" /></Field>
      <div style={S.addActions}><button style={S.primaryBtn}>{t.save}</button>{saved && <span style={S.savedMsg}>{t.saved}</span>}</div>
    </form>
  );
}

function AdminsTab({ t, ctrlPerms, meId, permsMode, onError }) {
  const [admins, setAdmins] = useState([]);
  const [nf, setNf] = useState({ username: '', fullName: '', password: '', permissions: [] });
  const reload = useCallback(async () => { try { const d = await api('/admins', undefined, t); setAdmins(d.items || []); } catch (e) { onError(e.message); } }, [t, onError]);
  useEffect(() => { reload(); }, [reload]);

  async function add(e) {
    e.preventDefault(); onError('');
    try { await api('/admins', { method: 'POST', body: JSON.stringify(nf) }, t); setNf({ username: '', fullName: '', password: '', permissions: [] }); await reload(); }
    catch (e2) { onError(e2.message); }
  }
  async function savePerms(a) { try { await api(`/admins/${a.id}`, { method: 'PATCH', body: JSON.stringify({ permissions: a.permissions }) }, t); await reload(); } catch (e) { onError(e.message); } }
  async function toggleActive(a) { try { await api(`/admins/${a.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !a.isActive }) }, t); await reload(); } catch (e) { onError(e.message); } }
  async function del(a) { if (!window.confirm(`${t.del}: ${a.username}?`)) return; try { await api(`/admins/${a.id}`, { method: 'DELETE' }, t); await reload(); } catch (e) { onError(e.message); } }

  return (
    <>
      {!permsMode && (
        <form onSubmit={add} style={S.addCard}>
          <div style={S.addRow}>
            <Field label={t.username}><input style={S.input} value={nf.username} onChange={(e) => setNf({ ...nf, username: e.target.value })} required /></Field>
            <Field label={t.fullName}><input style={S.input} value={nf.fullName} onChange={(e) => setNf({ ...nf, fullName: e.target.value })} /></Field>
            <Field label={t.password}><input style={S.input} value={nf.password} onChange={(e) => setNf({ ...nf, password: e.target.value })} required /></Field>
          </div>
          <div style={S.permGrid}>{ctrlPerms.map((p) => <label key={p.key} style={S.check}><input type="checkbox" checked={nf.permissions.includes(p.key)} onChange={(e) => setNf((s) => ({ ...s, permissions: e.target.checked ? [...s.permissions, p.key] : s.permissions.filter((k) => k !== p.key) }))} /> {p[t.dir === 'rtl' ? 'ar' : 'en']}</label>)}</div>
          <div style={S.addActions}><button style={S.primaryBtn}>{t.addAdmin}</button></div>
        </form>
      )}
      <div style={S.grid}>
        {admins.map((a) => <AdminRow key={a.id} t={t} a={a} ctrlPerms={ctrlPerms} permsMode={permsMode} isSelf={a.id === meId} onSavePerms={savePerms} onToggle={toggleActive} onDel={del} />)}
      </div>
    </>
  );
}

function AdminRow({ t, a, ctrlPerms, permsMode, isSelf, onSavePerms, onToggle, onDel }) {
  const [perms, setPerms] = useState(a.permissions || []);
  useEffect(() => setPerms(a.permissions || []), [a]);
  return (
    <div style={S.card}>
      <div style={S.cardHead}><span style={S.slug}>{a.username}</span><span style={{ ...S.badge, background: a.isActive ? '#16633a' : '#7a2230' }}>{a.isActive ? t.adminActive : t.adminInactive}</span></div>
      {a.fullName && <div style={S.meta}>{a.fullName}</div>}
      {permsMode ? (
        <>
          <div style={S.permGrid}>{ctrlPerms.map((p) => <label key={p.key} style={S.check}><input type="checkbox" checked={perms.includes(p.key)} onChange={(e) => setPerms((s) => e.target.checked ? [...s, p.key] : s.filter((k) => k !== p.key))} /> {p[t.dir === 'rtl' ? 'ar' : 'en']}</label>)}</div>
          <div style={S.cardActions}><button style={S.primaryBtn} onClick={() => onSavePerms({ ...a, permissions: perms })}>{t.savePerms}</button></div>
        </>
      ) : (
        <div style={S.cardActions}>
          <button style={S.ghostBtn} onClick={() => onToggle(a)}>{a.isActive ? t.deactivate : t.activate}</button>
          {!isSelf && <button style={S.dangerBtn} onClick={() => onDel(a)}>{t.del}</button>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <label style={S.field}><span style={S.fieldLabel}>{label}</span>{children}</label>; }

const S = {
  app: { minHeight: '100vh', display: 'flex', background: 'var(--c-bg)', color: 'var(--c-text)', fontFamily: 'system-ui, sans-serif' },
  sidebar: { width: 210, flexShrink: 0, background: 'var(--c-side)', borderInlineEnd: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', padding: '16px 12px' },
  logo: { fontSize: 20, fontWeight: 800, color: 'var(--c-accent)', padding: '4px 10px 16px' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, background: 'transparent', color: 'var(--c-text)', border: 'none', borderRadius: 9, padding: '10px 12px', fontSize: 14, cursor: 'pointer', textAlign: 'start', width: '100%' },
  navActive: { background: 'var(--c-hover)', fontWeight: 700 },
  navIcon: { fontSize: 15, opacity: 0.8 },
  sideFoot: { display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--c-border)' },
  content: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-panel)', fontSize: 16 },
  topRight: { display: 'flex', gap: 12, alignItems: 'center' },
  who: { color: 'var(--c-muted)', fontSize: 13 },
  errorBar: { background: '#7a2230', color: '#fff', padding: '10px 22px', cursor: 'pointer', fontSize: 14 },
  main: { padding: 22, overflow: 'auto' },
  empty: { color: 'var(--c-muted)', padding: 20 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 },
  statCard: { background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18, textAlign: 'center' },
  statVal: { fontSize: 30, fontWeight: 800, color: 'var(--c-accent)' },
  statLbl: { fontSize: 13, color: 'var(--c-muted)', marginTop: 4 },
  h3: { fontSize: 15, margin: '22px 0 10px' },
  planRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  planChip: { background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 20, padding: '6px 14px', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14, marginTop: 14 },
  addBtn: { background: 'var(--c-accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 18px', fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  addCard: { background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 },
  addRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  addActions: { display: 'flex', gap: 10, marginTop: 4, alignItems: 'center' },
  card: { background: 'var(--c-panel)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 },
  cardHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  slug: { fontSize: 16, fontWeight: 700, color: 'var(--c-slug)' },
  name: { fontSize: 13, color: 'var(--c-muted)' },
  badge: { fontSize: 11, color: '#fff', borderRadius: 20, padding: '2px 9px', marginInlineStart: 8 },
  meta: { fontSize: 12, color: 'var(--c-muted)' },
  row: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 },
  fieldLabel: { fontSize: 11, color: 'var(--c-muted)' },
  formCol: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 460 },
  input: { padding: '9px 11px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-input)', color: 'var(--c-text)', fontSize: 14, outline: 'none', width: '100%' },
  inputSm: { padding: '7px 9px', borderRadius: 7, border: '1px solid var(--c-border)', background: 'var(--c-input)', color: 'var(--c-text)', fontSize: 13, outline: 'none', width: '100%' },
  featRow: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' },
  featLabel: { fontSize: 12, color: 'var(--c-muted)' },
  check: { fontSize: 12, color: 'var(--c-text)', display: 'flex', gap: 4, alignItems: 'center' },
  cardActions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  primaryBtn: { background: 'var(--c-accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  ghostBtn: { background: 'transparent', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  iconBtn: { background: 'transparent', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: 8, padding: '7px 11px', fontSize: 14, cursor: 'pointer', lineHeight: 1, flex: 1 },
  dangerBtn: { background: 'transparent', color: '#ff8087', border: '1px solid #5a2730', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' },
  savedMsg: { color: '#3fb950', fontSize: 13 },
  tabBar: { display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid var(--c-border)' },
  tab: { background: 'transparent', color: 'var(--c-muted)', border: 'none', borderBottom: '2px solid transparent', padding: '8px 14px', fontSize: 14, cursor: 'pointer' },
  tabOn: { color: 'var(--c-text)', borderBottomColor: 'var(--c-accent)', fontWeight: 700 },
  permGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 },
  manageBox: { borderTop: '1px solid var(--c-border)', marginTop: 6, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 },
  subTabs: { display: 'flex', gap: 6 },
  subTab: { background: 'transparent', color: 'var(--c-muted)', border: '1px solid var(--c-border)', borderRadius: 7, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  subTabOn: { color: 'var(--c-text)', borderColor: 'var(--c-accent)', fontWeight: 700 },
  inlineForm: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: 4 },
  listItem: { fontSize: 13, padding: '5px 0', borderBottom: '1px solid var(--c-border)' },
  muted: { color: 'var(--c-muted)', fontSize: 12 },
};
