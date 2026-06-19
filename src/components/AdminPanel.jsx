'use client';

import { useCallback, useEffect, useState } from 'react';

// لوحة الإدارة: المستخدمون · الأدوار والصلاحيات · الإعدادات (المنفذ) · التحقق الثنائي.
// تظهر فقط لمن يملك صلاحيات إدارية. ثنائية اللغة عبر prop: lang.

const C = {
  card: '#fff', border: '#e2e6e9', text: '#1f272e', muted: '#6b7785',
  green: '#1f7a4d', red: '#e03636', amber: '#cb8a14', blue: '#2490ef',
};

const T = {
  ar: {
    secUsers: 'المستخدمون', secRoles: 'الأدوار والصلاحيات', secSettings: 'الإعدادات', sec2fa: 'التحقق الثنائي',
    username: 'اسم المستخدم', fullName: 'الاسم', email: 'البريد', roles: 'الأدوار', active: 'نشط',
    twofa: '2FA', actions: 'إجراءات', create: 'إنشاء', save: 'حفظ', del: 'حذف', edit: 'تعديل',
    resetonts2fa: 'إعادة ضبط 2FA', password: 'كلمة المرور', newUser: 'مستخدم جديد', newRole: 'دور جديد',
    roleName: 'اسم الدور', description: 'الوصف', permissions: 'الصلاحيات', system: 'نظام',
    port: 'رقم المنفذ', portHint: 'يتطلب إعادة تشغيل الخدمة لتطبيقه فعلياً.', saved: 'تم الحفظ',
    enabled: 'مفعّل', disabled: 'غير مفعّل', enable2fa: 'تفعيل التحقق الثنائي',
    scan: 'امسح الرمز بتطبيق المصادقة ثم أدخل الرمز:', confirm: 'تأكيد', code: 'الرمز',
    twofaOn: 'التحقق الثنائي مفعّل لحسابك. لتعطيله يلزم مدير.', selectRoles: 'اختر الأدوار',
    confirmDel: 'تأكيد الحذف؟', none: '—',
  },
  en: {
    secUsers: 'Users', secRoles: 'Roles & permissions', secSettings: 'Settings', sec2fa: 'Two-factor',
    username: 'Username', fullName: 'Name', email: 'Email', roles: 'Roles', active: 'Active',
    twofa: '2FA', actions: 'Actions', create: 'Create', save: 'Save', del: 'Delete', edit: 'Edit',
    resetonts2fa: 'Reset 2FA', password: 'Password', newUser: 'New user', newRole: 'New role',
    roleName: 'Role name', description: 'Description', permissions: 'Permissions', system: 'system',
    port: 'Port number', portHint: 'Requires a service restart to actually take effect.', saved: 'Saved',
    enabled: 'Enabled', disabled: 'Disabled', enable2fa: 'Enable two-factor',
    scan: 'Scan the QR in your authenticator app, then enter the code:', confirm: 'Confirm', code: 'Code',
    twofaOn: 'Two-factor is enabled. Only an admin can disable it.', selectRoles: 'Select roles',
    confirmDel: 'Confirm delete?', none: '—',
  },
};

async function api(url, opts) {
  const res = await fetch(url, { cache: 'no-store', ...opts });
  const body = await res.json().catch(() => ({}));
  if (!body.ok) throw new Error(body.error || 'error');
  return body.data;
}

const box = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 16 };
const inp = { border: `1px solid ${C.border}`, borderRadius: 5, padding: '6px 9px', fontSize: 13, fontFamily: 'inherit' };
const btn = (bg) => ({ background: bg, color: '#fff', border: 0, borderRadius: 5, padding: '6px 12px', fontSize: 13, cursor: 'pointer' });
const ghost = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 5, padding: '6px 10px', fontSize: 13, cursor: 'pointer' };
const cell = { padding: '7px 9px', borderBottom: `1px solid ${C.border}`, fontSize: 13, textAlign: 'start' };

export default function AdminPanel({ lang = 'ar', perms = [] }) {
  const t = T[lang] || T.ar;
  const can = (k) => perms.includes(k);
  const sections = [
    can('manage_users') && 'users',
    can('manage_roles') && 'roles',
    can('manage_settings') && 'settings',
    '2fa',
  ].filter(Boolean);
  const [sec, setSec] = useState(sections[0]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {sections.map((s) => (
          <button key={s} onClick={() => setSec(s)} style={sec === s ? btn(C.green) : ghost}>
            {s === 'users' ? t.secUsers : s === 'roles' ? t.secRoles : s === 'settings' ? t.secSettings : t.sec2fa}
          </button>
        ))}
      </div>
      {sec === 'users' && <UsersSection t={t} />}
      {sec === 'roles' && <RolesSection t={t} />}
      {sec === 'settings' && <SettingsSection t={t} />}
      {sec === '2fa' && <TwoFactorSection t={t} />}
    </div>
  );
}

// ----------------------------------------------------------- Users
function UsersSection({ t }) {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ username: '', fullName: '', email: '', password: '', roleIds: [] });
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const [u, r] = await Promise.all([api('/api/users'), api('/api/roles')]);
    setUsers(u.items);
    setRoles(r.items);
  }, []);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  async function create() {
    setErr('');
    try {
      await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setForm({ username: '', fullName: '', email: '', password: '', roleIds: [] });
      await load();
    } catch (e) { setErr(e.message); }
  }
  async function toggleActive(u) {
    await api(`/api/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !u.isActive }) });
    await load();
  }
  async function setUserRoles(u, roleIds) {
    await api(`/api/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roleIds }) });
    await load();
  }
  async function reset2fa(u) {
    await api(`/api/users/${u.id}/reset-2fa`, { method: 'POST' });
    await load();
  }
  async function remove(u) {
    if (!confirm(t.confirmDel)) return;
    await api(`/api/users/${u.id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <>
      <div style={box}>
        <h3 style={{ marginTop: 0 }}>{t.newUser}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder={t.username} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={inp} />
          <input placeholder={t.fullName} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={inp} />
          <input placeholder={t.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inp} />
          <input placeholder={t.password} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inp} />
          <MultiRole roles={roles} value={form.roleIds} onChange={(roleIds) => setForm({ ...form, roleIds })} t={t} />
          <button onClick={create} style={btn(C.green)}>{t.create}</button>
        </div>
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</div>}
      </div>

      <div style={box}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={cell}>{t.username}</th><th style={cell}>{t.fullName}</th>
              <th style={cell}>{t.roles}</th><th style={cell}>{t.active}</th>
              <th style={cell}>{t.twofa}</th><th style={cell}>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={cell}><strong>{u.username}</strong></td>
                <td style={cell}>{u.fullName || t.none}</td>
                <td style={cell}><MultiRole roles={roles} value={u.roles.map((r) => r.id)} onChange={(ids) => setUserRoles(u, ids)} t={t} /></td>
                <td style={cell}>
                  <button onClick={() => toggleActive(u)} style={u.isActive ? btn(C.green) : ghost}>
                    {u.isActive ? t.enabled : t.disabled}
                  </button>
                </td>
                <td style={cell}>
                  <span style={{ color: u.totpEnabled ? C.green : C.muted }}>{u.totpEnabled ? t.enabled : t.disabled}</span>
                </td>
                <td style={cell}>
                  <button onClick={() => reset2fa(u)} style={{ ...ghost, marginInlineEnd: 6 }}>{t.resetonts2fa}</button>
                  <button onClick={() => remove(u)} style={btn(C.red)}>{t.del}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// قائمة أدوار متعددة الاختيار (مبسّطة عبر checkboxes منسدلة)
function MultiRole({ roles, value, onChange, t }) {
  return (
    <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }} title={t.selectRoles}>
      {roles.map((r) => {
        const on = value.includes(r.id);
        return (
          <button
            key={r.id}
            onClick={() => onChange(on ? value.filter((x) => x !== r.id) : [...value, r.id])}
            style={on ? btn(C.blue) : ghost}
          >
            {r.name}
          </button>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------- Roles
function RolesSection({ t }) {
  const [roles, setRoles] = useState([]);
  const [perms, setPerms] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] });
  const [err, setErr] = useState('');
  const lang = t === T.en ? 'en' : 'ar';

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([api('/api/roles'), api('/api/permissions')]);
    setRoles(r.items);
    setPerms(p.items);
  }, []);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  const permLabel = (p) => (lang === 'en' ? p.labelEn : p.labelAr);

  async function create() {
    setErr('');
    try {
      await api('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      setForm({ name: '', description: '', permissions: [] });
      await load();
    } catch (e) { setErr(e.message); }
  }
  async function savePerms(role, permissions) {
    await api(`/api/roles/${role.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ permissions }) });
    await load();
  }
  async function remove(role) {
    if (!confirm(t.confirmDel)) return;
    try { await api(`/api/roles/${role.id}`, { method: 'DELETE' }); await load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <>
      <div style={box}>
        <h3 style={{ marginTop: 0 }}>{t.newRole}</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <input placeholder={t.roleName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inp} />
          <input placeholder={t.description} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...inp, minWidth: 220 }} />
          <button onClick={create} style={btn(C.green)}>{t.create}</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {perms.map((p) => {
            const on = form.permissions.includes(p.key);
            return (
              <button key={p.key} onClick={() => setForm({ ...form, permissions: on ? form.permissions.filter((x) => x !== p.key) : [...form.permissions, p.key] })} style={on ? btn(C.blue) : ghost}>
                {permLabel(p)}
              </button>
            );
          })}
        </div>
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</div>}
      </div>

      {roles.map((role) => (
        <div key={role.id} style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>
              {role.name} {role.isSystem && <span style={{ color: C.amber, fontSize: 12 }}>({t.system})</span>}
              {role.description && <span style={{ color: C.muted, fontSize: 13, fontWeight: 400 }}> — {role.description}</span>}
            </h3>
            {!role.isSystem && <button onClick={() => remove(role)} style={btn(C.red)}>{t.del}</button>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {perms.map((p) => {
              const on = role.permissions.includes(p.key);
              const disabled = role.isSystem; // دور النظام صلاحياته ثابتة
              return (
                <button
                  key={p.key}
                  disabled={disabled}
                  onClick={() => savePerms(role, on ? role.permissions.filter((x) => x !== p.key) : [...role.permissions, p.key])}
                  style={{ ...(on ? btn(C.blue) : ghost), opacity: disabled ? 0.6 : 1, cursor: disabled ? 'default' : 'pointer' }}
                >
                  {permLabel(p)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

// ----------------------------------------------------------- Settings (port)
function SettingsSection({ t }) {
  const [port, setPort] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/api/settings').then((d) => setPort(d.settings.app_port || '')).catch((e) => setErr(e.message));
  }, []);

  async function save() {
    setMsg(''); setErr('');
    try {
      await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_port: port }) });
      setMsg(t.saved);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={box}>
      <h3 style={{ marginTop: 0 }}>{t.secSettings}</h3>
      <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t.port}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" style={{ ...inp, width: 120 }} />
        <button onClick={save} style={btn(C.green)}>{t.save}</button>
        {msg && <span style={{ color: C.green, fontSize: 13 }}>{msg}</span>}
        {err && <span style={{ color: C.red, fontSize: 13 }}>{err}</span>}
      </div>
      <p style={{ color: C.muted, fontSize: 12, marginBottom: 0 }}>{t.portHint}</p>
    </div>
  );
}

// ----------------------------------------------------------- My 2FA
function TwoFactorSection({ t }) {
  const [me, setMe] = useState(null);
  const [enroll, setEnroll] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const d = await api('/api/auth/me');
    setMe(d.user);
  }, []);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  async function start() {
    setErr('');
    try { setEnroll(await api('/api/2fa/setup', { method: 'POST' })); }
    catch (e) { setErr(e.message); }
  }
  async function confirm() {
    setErr('');
    try {
      await api('/api/2fa/enable', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: code }) });
      setEnroll(null); setCode('');
      await load();
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={box}>
      <h3 style={{ marginTop: 0 }}>{t.sec2fa}</h3>
      {me?.totpEnabled ? (
        <div style={{ color: C.green, fontSize: 14 }}>✓ {t.twofaOn}</div>
      ) : enroll ? (
        <div>
          <p style={{ fontSize: 13 }}>{t.scan}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enroll.qrDataUrl} alt="QR" width={180} height={180} style={{ border: `1px solid ${C.border}`, borderRadius: 8 }} />
          <div style={{ fontSize: 12, color: C.muted, margin: '6px 0', direction: 'ltr', textAlign: 'start' }}>{enroll.secret}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t.code} inputMode="numeric" style={{ ...inp, letterSpacing: 3, textAlign: 'center', width: 120 }} />
            <button onClick={confirm} style={btn(C.green)}>{t.confirm}</button>
          </div>
        </div>
      ) : (
        <button onClick={start} style={btn(C.green)}>{t.enable2fa}</button>
      )}
      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</div>}
    </div>
  );
}
