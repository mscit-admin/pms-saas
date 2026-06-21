'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// لوحة الإدارة: المستخدمون · الأدوار والصلاحيات · الإعدادات (المنفذ) · التحقق الثنائي.
// تظهر فقط لمن يملك صلاحيات إدارية. ثنائية اللغة عبر prop: lang.

const C = {
  card: 'var(--c-card)', border: 'var(--c-border)', text: 'var(--c-text)', muted: 'var(--c-muted)',
  green: '#1f7a4d', red: '#e03636', amber: '#cb8a14', blue: '#2490ef',
};

const T = {
  ar: {
    secUsers: 'المستخدمون', secRoles: 'الأدوار والصلاحيات', secSettings: 'الإعدادات', sec2fa: 'التحقق الثنائي',
    secBranding: 'الهوية', secIntegration: 'الربط بجيرا', secLogs: 'السجلّات', secAi: 'الذكاء الاصطناعي',
    aiEnabled: 'تفعيل اقتراح التعليقات', aiProvider: 'المزوّد', aiBaseUrl: 'الرابط (Base URL)', aiModel: 'النموذج', aiKeyL: 'مفتاح API', aiAnthropic: 'Anthropic (Claude)', aiOpenai: 'متوافق مع OpenAI',
    loginLogs: 'سجلّ الدخول', auditLogs: 'سجلّ التدقيق', time: 'الوقت', actor: 'المنفّذ', actionC: 'الإجراء', target: 'الهدف', ipC: 'IP', detailC: 'تفاصيل', noLogs: 'لا سجلّات', from2: 'من', to2: 'إلى',
    al: { login_success: 'دخول ناجح', login_failed: 'محاولة فاشلة', logout: 'خروج', user_create: 'إنشاء مستخدم', user_update: 'تعديل مستخدم', user_delete: 'حذف مستخدم', reset_2fa: 'إعادة ضبط 2FA', role_create: 'إنشاء دور', role_update: 'تعديل دور', role_delete: 'حذف دور', settings_update: 'تعديل إعدادات', integration_update: 'تعديل الربط', branding_upload: 'رفع هوية', branding_remove: 'إزالة هوية', ticket_assign: 'إسناد تذكرة', ticket_comment: 'تعليق', ticket_transition: 'نقل حالة', ticket_fields: 'تعديل حقول', followup_update: 'متابعة' },
    logo: 'الشعار', favicon: 'أيقونة المتصفح', upload: 'رفع', remove: 'إزالة', currentImg: 'الحالي', noImg: 'لا يوجد',
    appBg: 'خلفية التطبيق', loginBg: 'خلفية شاشة الدخول', dim: 'الخفوت', show: 'إظهار الصورة', saveDisplay: 'حفظ العرض', refreshHint2: 'حدّث الصفحة لرؤية الأثر.',
    baseUrl: 'رابط جيرا', emailF: 'البريد', apiToken: 'API Token', tokenKeep: 'اتركه فارغاً للإبقاء على الحالي', tokenSet: 'محفوظ', tokenNone: 'غير محفوظ',
    jql: 'JQL', searchPath: 'مسار البحث', pageSize: 'حجم الصفحة', test: 'اختبار الاتصال', testing: 'جارٍ الاختبار…', connectedAs: 'متصل باسم', saveSettings: 'حفظ',
    username: 'اسم المستخدم', fullName: 'الاسم', email: 'البريد', roles: 'الأدوار', active: 'نشط',
    twofa: '2FA', actions: 'إجراءات', create: 'إنشاء', save: 'حفظ', del: 'حذف', edit: 'تعديل',
    resetonts2fa: 'إعادة ضبط 2FA', password: 'كلمة المرور', newUser: 'مستخدم جديد', newRole: 'دور جديد',
    roleName: 'اسم الدور', description: 'الوصف', permissions: 'الصلاحيات', system: 'نظام',
    port: 'رقم المنفذ', portHint: 'سيُعاد تشغيل الخدمة تلقائياً ويُحدَّث nginx لتطبيق المنفذ. حدّث الصفحة بعد لحظات.', saved: 'تم الحفظ — جارٍ إعادة التشغيل', portManual: 'حُفظ المنفذ. إعادة التشغيل التلقائي غير مُفعّلة — أعد تشغيل الخدمة يدوياً.',
    appName: 'اسم التطبيق', appSubtitle: 'العنوان الفرعي', savedShort: 'تم الحفظ',
    depClearTitle: 'حالات إلغاء الاعتمادية', depClearHint: 'عند وصول التذكرة الحاجبة لإحدى هذه الحالات تُعتبر الاعتمادية ملغاة وتختفي من شاشة «اختناقات الاعتمادية». (حالة Done تُلغيها تلقائياً دائماً.)',
    depAutoRemove: 'عند الإلغاء: احذف رابط جيرا تلقائياً وسجّله في سجلّ المراجعة',
    appNameEn: 'اسم التطبيق (إنجليزي)', appSubtitleEn: 'العنوان الفرعي (إنجليزي)',
    rowsPerPage: 'عدد الصفوف في الصفحة',
    bgDim: 'خفوت صورة الخلفية', bgDimHint: 'كلما زادت النسبة، خفتت الصورة وزاد وضوح المحتوى.', refreshHint: 'حدّث الصفحة لرؤية الأثر.',
    changePwd: 'تغيير كلمة المرور', curPwd: 'كلمة المرور الحالية', newPwd: 'كلمة المرور الجديدة', confPwd: 'تأكيد كلمة المرور', pwdChanged: 'تم تغيير كلمة المرور', pwdMismatch: 'كلمتا المرور غير متطابقتين',
    profile: 'الملف الشخصي', profilePic: 'صورة الملف الشخصي', profileSaved: 'تم حفظ الملف الشخصي',
    cropTitle: 'قص وتحجيم الصورة', cropZoom: 'تكبير', cancel: 'إلغاء', apply: 'تطبيق',
    enabled: 'مفعّل', disabled: 'غير مفعّل', enable2fa: 'تفعيل التحقق الثنائي',
    scan: 'امسح الرمز بتطبيق المصادقة ثم أدخل الرمز:', confirm: 'تأكيد', code: 'الرمز',
    twofaOn: 'التحقق الثنائي مفعّل لحسابك. لتعطيله يلزم مدير.', selectRoles: 'اختر الأدوار',
    confirmDel: 'تأكيد الحذف؟', none: '—',
  },
  en: {
    secUsers: 'Users', secRoles: 'Roles & permissions', secSettings: 'Settings', sec2fa: 'Two-factor',
    secBranding: 'Branding', secIntegration: 'Jira connection', secLogs: 'Logs', secAi: 'AI',
    aiEnabled: 'Enable comment suggestions', aiProvider: 'Provider', aiBaseUrl: 'Base URL', aiModel: 'Model', aiKeyL: 'API key', aiAnthropic: 'Anthropic (Claude)', aiOpenai: 'OpenAI-compatible',
    loginLogs: 'Login log', auditLogs: 'Audit log', time: 'Time', actor: 'Actor', actionC: 'Action', target: 'Target', ipC: 'IP', detailC: 'Detail', noLogs: 'No entries', from2: 'From', to2: 'To',
    al: { login_success: 'Login OK', login_failed: 'Login failed', logout: 'Logout', user_create: 'Create user', user_update: 'Update user', user_delete: 'Delete user', reset_2fa: 'Reset 2FA', role_create: 'Create role', role_update: 'Update role', role_delete: 'Delete role', settings_update: 'Update settings', integration_update: 'Update integration', branding_upload: 'Branding upload', branding_remove: 'Branding remove', ticket_assign: 'Assign ticket', ticket_comment: 'Comment', ticket_transition: 'Transition', ticket_fields: 'Edit fields', followup_update: 'Follow-up' },
    logo: 'Logo', favicon: 'Favicon', upload: 'Upload', remove: 'Remove', currentImg: 'Current', noImg: 'none',
    appBg: 'App background', loginBg: 'Login background', dim: 'Dimming', show: 'Show image', saveDisplay: 'Save display', refreshHint2: 'Refresh the page to see the effect.',
    baseUrl: 'Jira URL', emailF: 'Email', apiToken: 'API Token', tokenKeep: 'Leave blank to keep current', tokenSet: 'saved', tokenNone: 'not set',
    jql: 'JQL', searchPath: 'Search path', pageSize: 'Page size', test: 'Test connection', testing: 'Testing…', connectedAs: 'Connected as', saveSettings: 'Save',
    username: 'Username', fullName: 'Name', email: 'Email', roles: 'Roles', active: 'Active',
    twofa: '2FA', actions: 'Actions', create: 'Create', save: 'Save', del: 'Delete', edit: 'Edit',
    resetonts2fa: 'Reset 2FA', password: 'Password', newUser: 'New user', newRole: 'New role',
    roleName: 'Role name', description: 'Description', permissions: 'Permissions', system: 'system',
    port: 'Port number', portHint: 'The service auto-restarts and nginx is updated to apply the port. Refresh the page in a moment.', saved: 'Saved — restarting', portManual: 'Port saved. Auto-restart not enabled — restart the service manually.',
    appName: 'App name', appSubtitle: 'Subtitle', savedShort: 'Saved',
    depClearTitle: 'Dependency-cleared statuses', depClearHint: 'When the blocking ticket reaches one of these statuses, the dependency is treated as cleared and hidden from the Dependency bottlenecks screen. (Done always clears it.)',
    depAutoRemove: 'On clear: delete the Jira link automatically and record it in the review log',
    appNameEn: 'App name (English)', appSubtitleEn: 'Subtitle (English)',
    rowsPerPage: 'Rows per page',
    bgDim: 'Background dimming', bgDimHint: 'Higher = fainter image, clearer content.', refreshHint: 'Refresh the page to see the effect.',
    changePwd: 'Change password', curPwd: 'Current password', newPwd: 'New password', confPwd: 'Confirm password', pwdChanged: 'Password changed', pwdMismatch: 'Passwords do not match',
    profile: 'Profile', profilePic: 'Profile picture', profileSaved: 'Profile saved',
    cropTitle: 'Crop & resize', cropZoom: 'Zoom', cancel: 'Cancel', apply: 'Apply',
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

const SECTION_LABELS = (t) => ({
  users: t.secUsers, roles: t.secRoles, integration: t.secIntegration, ai: t.secAi,
  branding: t.secBranding, settings: t.secSettings, logs: t.secLogs, '2fa': t.sec2fa,
});

// قائمة أقسام الإدارة (بدون 2FA) لبنائها في القائمة الجانبية الموحّدة.
export function adminSections(perms = [], lang = 'ar') {
  const t = T[lang] || T.ar;
  const can = (k) => perms.includes(k);
  const labels = SECTION_LABELS(t);
  return [
    can('manage_users') && 'users',
    can('manage_roles') && 'roles',
    can('manage_integration') && 'integration',
    can('manage_integration') && 'ai',
    can('manage_branding') && 'branding',
    can('manage_settings') && 'settings',
    can('view_audit') && 'logs',
  ].filter(Boolean).map((id) => ({ id, label: labels[id] }));
}

export default function AdminPanel({ lang = 'ar', perms = [], section }) {
  const t = T[lang] || T.ar;
  const can = (k) => perms.includes(k);
  const sections = [
    can('manage_users') && 'users',
    can('manage_roles') && 'roles',
    can('manage_integration') && 'integration',
    can('manage_integration') && 'ai',
    can('manage_branding') && 'branding',
    can('manage_settings') && 'settings',
    can('view_audit') && 'logs',
    '2fa',
  ].filter(Boolean);
  // وضع مُتحكَّم به: يُمرَّر القسم من القائمة الجانبية الخارجية (نُخفي شريط الأزرار).
  const controlled = section != null;
  const [secState, setSecState] = useState(sections[0]);
  const sec = controlled ? section : secState;
  const secLabel = (s) => SECTION_LABELS(t)[s];

  return (
    <div>
      {!controlled && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {sections.map((s) => (
            <button key={s} onClick={() => setSecState(s)} style={sec === s ? btn(C.green) : ghost}>{secLabel(s)}</button>
          ))}
        </div>
      )}
      {sec === 'users' && <UsersSection t={t} />}
      {sec === 'roles' && <RolesSection t={t} />}
      {sec === 'integration' && <IntegrationSection t={t} />}
      {sec === 'ai' && <AiSection t={t} />}
      {sec === 'branding' && <BrandingSection t={t} />}
      {sec === 'settings' && <SettingsSection t={t} />}
      {sec === 'logs' && <LogsSection t={t} />}
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
  const [appName, setAppName] = useState('');
  const [appSubtitle, setAppSubtitle] = useState('');
  const [appNameEn, setAppNameEn] = useState('');
  const [appSubtitleEn, setAppSubtitleEn] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [msg, setMsg] = useState('');
  const [nameMsg, setNameMsg] = useState('');
  const [err, setErr] = useState('');
  // حالات إلغاء الاعتمادية
  const [depAvailable, setDepAvailable] = useState([]);
  const [depSelected, setDepSelected] = useState([]);
  const [depAutoRemove, setDepAutoRemove] = useState(false);
  const [depMsg, setDepMsg] = useState('');

  useEffect(() => {
    api('/api/settings').then((d) => {
      setPort(d.settings.app_port || '');
      setAppName(d.settings.app_name || '');
      setAppSubtitle(d.settings.app_subtitle || '');
      setAppNameEn(d.settings.app_name_en || '');
      setAppSubtitleEn(d.settings.app_subtitle_en || '');
      setRowsPerPage(d.settings.page_size != null ? Number(d.settings.page_size) : 25);
    }).catch((e) => setErr(e.message));
    api('/api/integration/dep-statuses').then((d) => { setDepAvailable(d.available || []); setDepSelected(d.selected || []); setDepAutoRemove(!!d.autoRemove); }).catch(() => {});
  }, []);

  async function saveDep() {
    setDepMsg(''); setErr('');
    try {
      await api('/api/integration/dep-statuses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statuses: depSelected, autoRemove: depAutoRemove }) });
      setDepMsg(t.savedShort);
    } catch (e) { setErr(e.message); }
  }

  async function saveName() {
    setNameMsg(''); setErr('');
    try {
      await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_name: appName, app_subtitle: appSubtitle, app_name_en: appNameEn, app_subtitle_en: appSubtitleEn, page_size: rowsPerPage }) });
      setNameMsg(`${t.savedShort} — ${t.refreshHint}`);
    } catch (e) { setErr(e.message); }
  }
  async function savePort() {
    setMsg(''); setErr('');
    try {
      const d = await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_port: port }) });
      setMsg(d?.portApply?.restart ? t.saved : t.portManual);
    } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <div style={box}>
        <h3 style={{ marginTop: 0 }}>{t.appName}</h3>
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t.appName}</label>
        <input value={appName} onChange={(e) => setAppName(e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t.appSubtitle}</label>
        <input value={appSubtitle} onChange={(e) => setAppSubtitle(e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t.appNameEn}</label>
        <input value={appNameEn} onChange={(e) => setAppNameEn(e.target.value)} dir="ltr" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t.appSubtitleEn}</label>
        <input value={appSubtitleEn} onChange={(e) => setAppSubtitleEn(e.target.value)} dir="ltr" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>{t.rowsPerPage}</label>
        <input type="number" min="5" max="500" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} style={{ ...inp, width: 120, marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={saveName} style={btn(C.green)}>{t.save}</button>
          {nameMsg && <span style={{ color: C.green, fontSize: 13 }}>{nameMsg}</span>}
        </div>
      </div>

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>{t.port}</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" style={{ ...inp, width: 120 }} />
          <button onClick={savePort} style={btn(C.green)}>{t.save}</button>
          {msg && <span style={{ color: C.green, fontSize: 13 }}>{msg}</span>}
        </div>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 0 }}>{t.portHint}</p>
      </div>

      <div style={box}>
        <h3 style={{ marginTop: 0 }}>{t.depClearTitle}</h3>
        <p style={{ color: C.muted, fontSize: 12.5, marginTop: 0 }}>{t.depClearHint}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {depAvailable.length === 0 && <span style={{ color: C.muted, fontSize: 13 }}>—</span>}
          {depAvailable.map((s) => {
            const on = depSelected.includes(s);
            return (
              <button key={s} onClick={() => setDepSelected(on ? depSelected.filter((x) => x !== s) : [...depSelected, s])} style={on ? btn(C.blue) : ghost}>{s}</button>
            );
          })}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginBottom: 10 }}>
          <input type="checkbox" checked={depAutoRemove} onChange={(e) => setDepAutoRemove(e.target.checked)} />
          {t.depAutoRemove}
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={saveDep} style={btn(C.green)}>{t.save}</button>
          {depMsg && <span style={{ color: C.green, fontSize: 13 }}>{depMsg}</span>}
        </div>
      </div>
      {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
    </>
  );
}

// ----------------------------------------------------------- Branding
function BrandingSection({ t }) {
  const [manifest, setManifest] = useState(null);
  const [settings, setSettings] = useState({});
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [mr, s] = await Promise.all([
      fetch('/api/branding/manifest', { cache: 'no-store' }).then((r) => r.json()),
      api('/api/settings'),
    ]);
    setManifest(mr.data || {});
    setSettings(s.settings || {});
  }, []);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  async function upload(type, file) {
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/branding/asset/${type}`, { method: 'POST', body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      await load();
    } catch (e) { setErr(e.message); }
  }
  async function remove(type) {
    setErr('');
    try { await api(`/api/branding/asset/${type}`, { method: 'DELETE' }); await load(); }
    catch (e) { setErr(e.message); }
  }
  async function saveDisplay(patch) {
    setMsg(''); setErr('');
    try {
      await api('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      setSettings({ ...settings, ...patch });
      setMsg(`${t.savedShort} — ${t.refreshHint2}`);
    } catch (e) { setErr(e.message); }
  }

  const ts = manifest?.ts || '0';
  const has = (presentKey) => manifest && manifest[presentKey];

  // صف صورة بسيط (شعار/أيقونة)
  const simpleRow = (type, label) => (
    <div style={{ ...box, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ width: 130, fontWeight: 600 }}>{label}</div>
      <Preview type={type} present={has(type)} ts={ts} t={t} />
      <UploadBtn type={type} onUpload={upload} t={t} />
      {has(type) && <button onClick={() => remove(type)} style={btn(C.red)}>{t.remove}</button>}
    </div>
  );

  // صف خلفية: صورة + إظهار/إخفاء + خفوت
  const bgRow = (assetType, presentKey, label, dimKey, showKey) => {
    const dim = settings[dimKey] != null ? Number(settings[dimKey]) : 85;
    const show = settings[showKey] != null ? String(settings[showKey]) === '1' : true;
    return (
      <div style={box} key={assetType}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ width: 130, fontWeight: 600 }}>{label}</div>
          <Preview type={assetType} present={has(presentKey)} ts={ts} t={t} />
          <UploadBtn type={assetType} onUpload={upload} t={t} />
          {has(presentKey) && <button onClick={() => remove(assetType)} style={btn(C.red)}>{t.remove}</button>}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginInlineEnd: 16 }}>
          <input type="checkbox" checked={show} onChange={(e) => setSettings({ ...settings, [showKey]: e.target.checked ? '1' : '0' })} />
          {t.show}
        </label>
        <div style={{ marginTop: 8 }}>
          <label style={{ fontSize: 13 }}>{t.dim}: {dim}%</label>
          <input type="range" min="0" max="100" value={dim} onChange={(e) => setSettings({ ...settings, [dimKey]: Number(e.target.value) })} style={{ width: '100%' }} />
        </div>
        <button onClick={() => saveDisplay({ [dimKey]: dim, [showKey]: show })} style={btn(C.green)}>{t.saveDisplay}</button>
      </div>
    );
  };

  return (
    <div>
      {simpleRow('logo', t.logo)}
      {simpleRow('favicon', t.favicon)}
      {bgRow('background', 'background', t.appBg, 'app_bg_dim', 'app_bg_show')}
      {bgRow('login_background', 'loginBackground', t.loginBg, 'login_bg_dim', 'login_bg_show')}
      {msg && <div style={{ color: C.green, fontSize: 13 }}>{msg}</div>}
      {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
    </div>
  );
}

function Preview({ type, present, ts, t }) {
  return (
    <div style={{ width: 120, height: 60, border: `1px dashed ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#fafbfc' }}>
      {present
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={`/api/branding/asset/${type}?v=${ts}`} alt={type} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        : <span style={{ color: C.muted, fontSize: 12 }}>{t.noImg}</span>}
    </div>
  );
}

function UploadBtn({ type, onUpload, t }) {
  return (
    <label style={{ ...btn(C.green), display: 'inline-block' }}>
      {t.upload}
      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && onUpload(type, e.target.files[0])} />
    </label>
  );
}

// ----------------------------------------------------------- AI
function AiSection({ t }) {
  const [f, setF] = useState(null);
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => { setF(await api('/api/integration/ai')); }, []);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);
  if (!f) return <div style={{ color: C.muted, padding: 10 }}>…</div>;

  const upd = (k, v) => setF({ ...f, [k]: v });
  async function save() {
    setMsg(''); setErr('');
    try {
      await api('/api/integration/ai', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: f.enabled, provider: f.provider, baseUrl: f.baseUrl, model: f.model, apiKey: key }) });
      setKey(''); await load(); setMsg(t.savedShort);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={box}>
      <h3 style={{ marginTop: 0 }}>{t.secAi}</h3>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, fontSize: 14 }}>
        <input type="checkbox" checked={!!f.enabled} onChange={(e) => upd('enabled', e.target.checked)} /> {t.aiEnabled}
      </label>
      <label style={{ display: 'block', fontSize: 13, color: C.muted, marginBottom: 3 }}>{t.aiProvider}</label>
      <select value={f.provider} onChange={(e) => upd('provider', e.target.value)} style={{ ...inp, width: '100%', cursor: 'pointer', marginBottom: 10 }}>
        <option value="anthropic">{t.aiAnthropic}</option>
        <option value="openai">{t.aiOpenai}</option>
      </select>
      <label style={{ display: 'block', fontSize: 13, color: C.muted, marginBottom: 3 }}>{t.aiBaseUrl}</label>
      <input value={f.baseUrl || ''} onChange={(e) => upd('baseUrl', e.target.value)} dir="ltr" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 10 }} />
      <label style={{ display: 'block', fontSize: 13, color: C.muted, marginBottom: 3 }}>{t.aiModel}</label>
      <input value={f.model || ''} onChange={(e) => upd('model', e.target.value)} dir="ltr" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 10 }} />
      <label style={{ display: 'block', fontSize: 13, color: C.muted, marginBottom: 3 }}>
        {t.aiKeyL} <span style={{ color: f.hasKey ? C.green : C.amber }}>({f.hasKey ? t.tokenSet : t.tokenNone})</span>
      </label>
      <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={t.tokenKeep} dir="ltr" style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={save} style={btn(C.green)}>{t.saveSettings}</button>
        {msg && <span style={{ color: C.green, fontSize: 13 }}>{msg}</span>}
        {err && <span style={{ color: C.red, fontSize: 13 }}>{err}</span>}
      </div>
    </div>
  );
}

// ----------------------------------------------------------- Jira connection
function IntegrationSection({ t }) {
  const [f, setF] = useState(null);
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    const d = await api('/api/integration/jira');
    setF(d);
  }, []);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  if (!f) return <div style={{ color: C.muted, padding: 10 }}>…</div>;

  const upd = (k, v) => setF({ ...f, [k]: v });
  const payload = () => ({
    baseUrl: f.baseUrl, email: f.email, jql: f.jql, searchPath: f.searchPath,
    pageSize: f.pageSize, apiToken: token,
  });

  async function test() {
    setTesting(true); setMsg(''); setErr('');
    try {
      const d = await api('/api/integration/jira/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
      setMsg(`${t.connectedAs}: ${d.user || '—'}`);
    } catch (e) { setErr(e.message); } finally { setTesting(false); }
  }
  async function save() {
    setMsg(''); setErr('');
    try {
      await api('/api/integration/jira', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
      setToken('');
      await load();
      setMsg(t.saved);
    } catch (e) { setErr(e.message); }
  }

  const field = (label, k, type = 'text') => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: 'block', fontSize: 13, color: C.muted, marginBottom: 3 }}>{label}</label>
      <input type={type} value={f[k] ?? ''} onChange={(e) => upd(k, e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div style={box}>
      <h3 style={{ marginTop: 0 }}>{t.secIntegration}</h3>
      {field(t.baseUrl, 'baseUrl')}
      {field(t.emailF, 'email')}
      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 13, color: C.muted, marginBottom: 3 }}>
          {t.apiToken} <span style={{ color: f.hasToken ? C.green : C.amber }}>({f.hasToken ? t.tokenSet : t.tokenNone})</span>
        </label>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={t.tokenKeep} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
      </div>
      {field(t.jql, 'jql')}
      {field(t.searchPath, 'searchPath')}
      {field(t.pageSize, 'pageSize', 'number')}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <button onClick={save} style={btn(C.green)}>{t.saveSettings}</button>
        <button onClick={test} disabled={testing} style={ghost}>{testing ? t.testing : t.test}</button>
        {msg && <span style={{ color: C.green, fontSize: 13 }}>{msg}</span>}
        {err && <span style={{ color: C.red, fontSize: 13 }}>{err}</span>}
      </div>
    </div>
  );
}

// ----------------------------------------------------------- Logs
function LogsSection({ t }) {
  const [tab, setTab] = useState('login');
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [err, setErr] = useState('');
  const pageSize = 50;

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ category: tab, page: String(page), pageSize: String(pageSize) });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    setData(await api(`/api/audit?${qs.toString()}`));
  }, [tab, page, from, to]);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);
  useEffect(() => { setPage(1); }, [tab, from, to]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;
  const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-GB') : '—');
  const cellL = { padding: '6px 9px', borderBottom: `1px solid ${C.border}`, fontSize: 12.5, textAlign: 'start', whiteSpace: 'nowrap' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setTab('login')} style={tab === 'login' ? btn(C.green) : ghost}>{t.loginLogs}</button>
        <button onClick={() => setTab('audit')} style={tab === 'audit' ? btn(C.green) : ghost}>{t.auditLogs}</button>
        <span style={{ color: C.muted, fontSize: 13, marginInlineStart: 12 }}>{t.from2}</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
        <span style={{ color: C.muted, fontSize: 13 }}>{t.to2}</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} />
      </div>

      <div style={{ ...box, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={cellL}>{t.time}</th>
              <th style={cellL}>{t.actor}</th>
              <th style={cellL}>{t.actionC}</th>
              {tab === 'audit' && <th style={cellL}>{t.target}</th>}
              <th style={cellL}>{t.ipC}</th>
              <th style={cellL}>{t.detailC}</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items || []).map((r) => (
              <tr key={r.id}>
                <td style={cellL}>{fmtTime(r.created_at)}</td>
                <td style={cellL}>{r.actor_name || '—'}</td>
                <td style={{ ...cellL, color: r.action === 'login_failed' ? C.red : C.text }}>{t.al[r.action] || r.action}</td>
                {tab === 'audit' && <td style={cellL}>{[r.target_type, r.target_id].filter(Boolean).join(' · ') || '—'}</td>}
                <td style={cellL}>{r.ip || '—'}</td>
                <td style={{ ...cellL, whiteSpace: 'normal', color: C.muted }}>{r.detail || '—'}</td>
              </tr>
            ))}
            {(!data || data.items.length === 0) && (
              <tr><td style={cellL} colSpan={6}>{t.noLogs}</td></tr>
            )}
          </tbody>
        </table>
        {data && data.total > pageSize && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 10 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={ghost}>‹</button>
            <span style={{ fontSize: 13, color: C.muted }}>{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={ghost}>›</button>
          </div>
        )}
      </div>
      {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
    </div>
  );
}

// ----------------------------------------------------------- Avatar crop & resize
// قاطع صور خفيف بالـ canvas (بلا مكتبات): سحب للتحريك + شريط تكبير + إخراج مربّع.
function AvatarCropper({ t, file, onCancel, onSave }) {
  const D = 260;   // حجم مربّع المعاينة
  const OUT = 256; // دقّة الإخراج
  const canvasRef = useRef(null);
  const baseRef = useRef(1);
  const dragRef = useRef(null);
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const base = D / Math.min(im.width, im.height);
      baseRef.current = base;
      setImg(im);
      setZoom(1);
      setOff({ x: (D - im.width * base) / 2, y: (D - im.height * base) / 2 });
    };
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const scale = baseRef.current * zoom;
  const clamp = (o, sc) => {
    if (!img) return o;
    const w = img.width * sc; const h = img.height * sc;
    return { x: Math.min(0, Math.max(D - w, o.x)), y: Math.min(0, Math.max(D - h, o.y)) };
  };

  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, D, D);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, D, D);
    ctx.drawImage(img, off.x, off.y, img.width * scale, img.height * scale);
  }, [img, scale, off]);

  // أعد ضبط الإزاحة عند تغيّر التكبير حتى تبقى الصورة مغطّية للمربّع
  useEffect(() => { setOff((o) => clamp(o, baseRef.current * zoom)); }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const tp = e.touches ? e.touches[0] : e;
    return { x: (tp.clientX - rect.left) * (D / rect.width), y: (tp.clientY - rect.top) * (D / rect.height) };
  };
  const onDown = (e) => { const p = point(e); dragRef.current = { sx: p.x, sy: p.y, ox: off.x, oy: off.y }; };
  const onMove = (e) => {
    if (!dragRef.current) return;
    const p = point(e);
    setOff(clamp({ x: dragRef.current.ox + (p.x - dragRef.current.sx), y: dragRef.current.oy + (p.y - dragRef.current.sy) }, scale));
  };
  const onUp = () => { dragRef.current = null; };

  const apply = () => {
    if (!img) return;
    const out = document.createElement('canvas');
    out.width = OUT; out.height = OUT;
    const r = OUT / D;
    const octx = out.getContext('2d');
    octx.fillStyle = '#fff'; octx.fillRect(0, 0, OUT, OUT);
    octx.drawImage(img, off.x * r, off.y * r, img.width * scale * r, img.height * scale * r);
    out.toBlob((blob) => { if (blob) onSave(blob); }, 'image/jpeg', 0.9);
  };

  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, width: 'min(340px, 94vw)', boxShadow: '0 18px 50px rgba(0,0,0,.3)' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>{t.cropTitle}</h3>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef} width={D} height={D}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
            onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
            style={{ width: D, height: D, maxWidth: '100%', borderRadius: '50%', border: `1px solid ${C.border}`, cursor: 'grab', touchAction: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 4px' }}>
          <span style={{ fontSize: 12, color: C.muted }}>{t.cropZoom}</span>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
          <button onClick={onCancel} style={ghost}>{t.cancel}</button>
          <button onClick={apply} style={btn(C.green)}>{t.apply}</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------- My 2FA
function TwoFactorSection({ t }) {
  const [me, setMe] = useState(null);
  const [enroll, setEnroll] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  // تغيير كلمة المرور
  const [cur, setCur] = useState('');
  const [npw, setNpw] = useState('');
  const [cpw, setCpw] = useState('');
  const [pmsg, setPmsg] = useState('');
  const [perr, setPerr] = useState('');
  // الملف الشخصي (الاسم + الصورة)
  const [name, setName] = useState('');
  const [profMsg, setProfMsg] = useState('');
  const [profErr, setProfErr] = useState('');
  const [avatarTs, setAvatarTs] = useState(Date.now());
  const [cropFile, setCropFile] = useState(null);

  const load = useCallback(async () => {
    const d = await api('/api/auth/me');
    setMe(d.user);
    setName(d.user?.fullName || '');
  }, []);
  useEffect(() => { load().catch((e) => setErr(e.message)); }, [load]);

  async function saveName() {
    setProfMsg(''); setProfErr('');
    try {
      await api('/api/auth/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: name }) });
      setProfMsg(t.profileSaved);
      await load();
    } catch (e) { setProfErr(e.message); }
  }
  async function uploadAvatar(file) {
    setProfMsg(''); setProfErr('');
    try {
      const fd = new FormData();
      fd.append('file', file, 'avatar.jpg');
      const res = await fetch('/api/auth/avatar', { method: 'POST', body: fd });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'error');
      setAvatarTs(Date.now());
      setProfMsg(t.profileSaved);
      await load();
    } catch (e) { setProfErr(e.message); }
  }
  async function removeAvatar() {
    setProfMsg(''); setProfErr('');
    try {
      await fetch('/api/auth/avatar', { method: 'DELETE' });
      setAvatarTs(Date.now());
      await load();
    } catch (e) { setProfErr(e.message); }
  }

  async function changePwd() {
    setPmsg(''); setPerr('');
    if (npw !== cpw) { setPerr(t.pwdMismatch); return; }
    try {
      await api('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: cur, newPassword: npw }) });
      setCur(''); setNpw(''); setCpw(''); setPmsg(t.pwdChanged);
    } catch (e) { setPerr(e.message); }
  }

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
    <>
    {cropFile && (
      <AvatarCropper t={t} file={cropFile} onCancel={() => setCropFile(null)} onSave={(blob) => { setCropFile(null); uploadAvatar(blob); }} />
    )}
    <div style={box}>
      <h3 style={{ marginTop: 0 }}>{t.profile}</h3>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          {me?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/auth/avatar?ts=${avatarTs}`} alt="avatar" width={72} height={72} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.border}` }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>
              {(me?.fullName || me?.username || '?').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ marginTop: 6, display: 'flex', gap: 6, justifyContent: 'center' }}>
            <label style={{ ...btn(C.green), cursor: 'pointer', fontSize: 12 }}>
              {t.upload}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) setCropFile(e.target.files[0]); e.target.value = ''; }} />
            </label>
            {me?.avatar && <button onClick={removeAvatar} style={{ ...ghost, fontSize: 12 }}>{t.remove}</button>}
          </div>
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: 13, color: C.muted }}>{t.fullName}</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inp, flex: 1 }} />
            <button onClick={saveName} style={btn(C.green)}>{t.save}</button>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>{me?.username}{me?.email ? ` · ${me.email}` : ''}</div>
          {profMsg && <div style={{ color: C.green, fontSize: 13, marginTop: 6 }}>{profMsg}</div>}
          {profErr && <div style={{ color: C.red, fontSize: 13, marginTop: 6 }}>{profErr}</div>}
        </div>
      </div>
    </div>

    <div style={box}>
      <h3 style={{ marginTop: 0 }}>{t.changePwd}</h3>
      <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder={t.curPwd} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 6 }} />
      <input type="password" value={npw} onChange={(e) => setNpw(e.target.value)} placeholder={t.newPwd} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 6 }} />
      <input type="password" value={cpw} onChange={(e) => setCpw(e.target.value)} placeholder={t.confPwd} style={{ ...inp, width: '100%', boxSizing: 'border-box', marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={changePwd} style={btn(C.green)}>{t.changePwd}</button>
        {pmsg && <span style={{ color: C.green, fontSize: 13 }}>{pmsg}</span>}
        {perr && <span style={{ color: C.red, fontSize: 13 }}>{perr}</span>}
      </div>
    </div>

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
    </>
  );
}
