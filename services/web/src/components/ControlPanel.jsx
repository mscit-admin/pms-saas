'use client';

import { useEffect, useState, useCallback } from 'react';

// لوحة المشرف الأعلى — تصميم بأسلوب ERPNext/Frappe (شريط علوي + قائمة جانبية بيضاء
// + بطاقات على لوحة رمادية فاتحة). ثنائية اللغة (RTL/LTR) ووضع فاتح/داكن، والأقسام
// محكومة بالصلاحيات. كل المنطق ونقاط الـ API كما هي.
const PLANS = ['trial', 'basic', 'pro', 'enterprise'];
const PLAN_COLORS = { trial: '#9cc9f5', basic: '#5fcf86', pro: '#5e64ff', enterprise: '#2490EF' };

const T = {
  ar: {
    dir: 'rtl', langBtn: 'English', search: 'ابحث أو اكتب أمراً (Ctrl + G)',
    workspaces: 'مساحات العمل', logout: 'تسجيل الخروج', crumbHome: 'الرئيسية',
    nav: { dashboard: 'لوحة المعلومات', customers: 'العملاء', settings: 'الإعدادات' },
    dash: {
      title: 'لوحة المعلومات', byPlan: 'حسب الخطة', tenants: 'إجمالي العملاء', active: 'مفعّل', suspended: 'معلّق', users: 'إجمالي المستخدمين', projects: 'إجمالي المشاريع',
      insights: 'رؤى العميل', selectCustomer: 'اختر عميلاً…', totalSize: 'حجم القاعدة', dataSize: 'البيانات', indexSize: 'الفهارس', tablesLbl: 'الجداول', rowsApprox: 'الصفوف (تقديري)', perf: 'مستوى الأداء',
      levelGood: 'جيّد', levelModerate: 'متوسّط', levelHeavy: 'مرتفع', topTables: 'أكبر الجداول',
      platformRes: 'موارد المنصّة', sharedNote: 'مشتركة بين كل العملاء', cpu: 'المعالج', mem: 'الذاكرة',
      mysqlPerf: 'أداء MySQL', connections: 'اتصالات', running: 'نشطة', qps: 'استعلام/ث', uptimeLbl: 'التشغيل', bufferPool: 'Buffer Pool', slowQ: 'استعلامات بطيئة', dockerOff: 'إحصاءات Docker غير متاحة (ركّب docker.sock).',
      dockerHost: 'مضيف Docker', cores: 'الأنوية', totalCpu: 'إجمالي المعالج', ramTotal: 'إجمالي الذاكرة', ramUsedC: 'ذاكرة الحاويات', disk: 'القرص', containersLbl: 'الحاويات', images: 'الصور', version: 'الإصدار',
    },
    cust: {
      title: 'العملاء', add: 'إضافة عميل', db: 'قاعدة:', active: 'مفعّل', suspended: 'معلّق',
      plan: 'الخطة', maxUsers: 'أقصى مستخدمين', maxProjects: 'أقصى مشاريع', save: 'حفظ', suspend: 'تعليق',
      manage: 'إدارة', adminPw: 'كلمة مرور الأدمن', del: 'حذف', users: 'المستخدمون', roles: 'الأدوار',
      username: 'اسم المستخدم', email: 'البريد', password: 'كلمة المرور', addUser: 'مستخدم', roleName: 'اسم الدور', addRole: 'دور',
      orgName: 'اسم المنظمة', slug: 'النطاق الفرعي (slug)', features: 'الوحدات', create: 'إنشاء', cancel: 'إلغاء', addTitle: 'إضافة عميل جديد',
      secBasic: 'الأساسي', secPlan: 'الخطة والحصص', noUsers: 'لا مستخدمين', noRoles: 'لا أدوار', roleOpt: 'الأدوار',
    },
    set: {
      title: 'الإعدادات', tabIdentity: 'الهوية البصرية', tabSupervisors: 'المشرفون', tabPermissions: 'الصلاحيات',
      platformName: 'اسم المنصّة', primaryColor: 'اللون الأساسي', save: 'حفظ', saved: 'تم الحفظ ✓',
      logo: 'الشعار', favicon: 'الأيقونة (Favicon)', loginBg: 'خلفية شاشة الدخول', choose: 'اختيار', remove: 'إزالة', noImg: 'لا صورة', uploading: 'جارٍ الرفع…',
      supUsername: 'اسم المستخدم', supFullName: 'الاسم الكامل', supPassword: 'كلمة المرور', addSup: 'إضافة مشرف',
      superAdmin: 'مشرف أعلى', disable: 'تعطيل', enable: 'تفعيل', savePerms: 'حفظ الصلاحيات',
    },
    confirmUser: (u) => `حذف المستخدم «${u}»؟`, confirmRole: (r) => `حذف الدور «${r}»؟`,
    newPwFor: (s) => `كلمة مرور جديدة لأدمن «${s}»:`, pwUpdated: 'تم تحديث كلمة مرور الأدمن.',
    confirmDel: (s) => `للحذف النهائي اكتب الـ slug: ${s}`, confirmDelClient: (n) => `حذف العميل «${n}» وقاعدة بياناته نهائياً؟ لا يمكن التراجع.`,
    invalidResp: 'استجابة غير صالحة', err: 'خطأ', noAccess: 'لا توجد لديك صلاحية لأي قسم.', okBtn: 'موافق', cancelBtn: 'إلغاء',
  },
  en: {
    dir: 'ltr', langBtn: 'العربية', search: 'Search or type a command (Ctrl + G)',
    workspaces: 'Workspaces', logout: 'Log out', crumbHome: 'Home',
    nav: { dashboard: 'Dashboard', customers: 'Customers', settings: 'Settings' },
    dash: {
      title: 'Dashboard', byPlan: 'By Plan', tenants: 'Total Customers', active: 'Active', suspended: 'Suspended', users: 'Total Users', projects: 'Total Projects',
      insights: 'Customer Insights', selectCustomer: 'Select a customer…', totalSize: 'DB Size', dataSize: 'Data', indexSize: 'Indexes', tablesLbl: 'Tables', rowsApprox: 'Rows (approx)', perf: 'Performance',
      levelGood: 'Good', levelModerate: 'Moderate', levelHeavy: 'Heavy', topTables: 'Largest tables',
      platformRes: 'Platform Resources', sharedNote: 'shared across all customers', cpu: 'CPU', mem: 'Memory',
      mysqlPerf: 'MySQL performance', connections: 'Connections', running: 'Running', qps: 'Queries/s', uptimeLbl: 'Uptime', bufferPool: 'Buffer Pool', slowQ: 'Slow queries', dockerOff: 'Docker stats unavailable (mount docker.sock).',
      dockerHost: 'Docker Host', cores: 'Cores', totalCpu: 'Total CPU', ramTotal: 'Total RAM', ramUsedC: 'Containers RAM', disk: 'Disk', containersLbl: 'Containers', images: 'Images', version: 'Version',
    },
    cust: {
      title: 'Customers', add: 'Add Customer', db: 'DB:', active: 'Active', suspended: 'Suspended',
      plan: 'Plan', maxUsers: 'Max Users', maxProjects: 'Max Projects', save: 'Save', suspend: 'Suspend',
      manage: 'Manage', adminPw: 'Admin Password', del: 'Delete', users: 'Users', roles: 'Roles',
      username: 'Username', email: 'Email', password: 'Password', addUser: 'User', roleName: 'Role name', addRole: 'Role',
      orgName: 'Organization name', slug: 'Subdomain (slug)', features: 'Features', create: 'Create', cancel: 'Cancel', addTitle: 'Add new customer',
      secBasic: 'Basics', secPlan: 'Plan & quotas', noUsers: 'No users', noRoles: 'No roles', roleOpt: 'Roles',
    },
    set: {
      title: 'Settings', tabIdentity: 'Visual Identity', tabSupervisors: 'Supervisors', tabPermissions: 'Permissions',
      platformName: 'Platform Name', primaryColor: 'Primary Color', save: 'Save', saved: 'Saved ✓',
      logo: 'Logo', favicon: 'Favicon', loginBg: 'Login Background', choose: 'Choose', remove: 'Remove', noImg: 'No image', uploading: 'Uploading…',
      supUsername: 'Username', supFullName: 'Full Name', supPassword: 'Password', addSup: 'Add Supervisor',
      superAdmin: 'Super Admin', disable: 'Disable', enable: 'Enable', savePerms: 'Save Permissions',
    },
    confirmUser: (u) => `Delete user "${u}"?`, confirmRole: (r) => `Delete role "${r}"?`,
    newPwFor: (s) => `New password for "${s}" admin:`, pwUpdated: 'Admin password updated.',
    confirmDel: (s) => `To permanently delete, type the slug: ${s}`, confirmDelClient: (n) => `Permanently delete customer "${n}" and its database? This cannot be undone.`,
    invalidResp: 'Invalid response', err: 'Error', noAccess: 'You have no access to any section.', okBtn: 'OK', cancelBtn: 'Cancel',
  },
};

const THEME = {
  light: { '--bg': '#f4f5f6', '--surface': '#ffffff', '--surface-2': '#f4f5f6', '--border': '#e6e9ec', '--border-2': '#dfe3e6', '--divider': '#eef0f2', '--text': '#1c2024', '--text-2': '#3c444c', '--muted': '#7a8189', '--muted-2': '#9aa0a6', '--hover': '#f0f2f4', '--shadow': 'rgba(17,24,28,.04)', '--inset': '#fafbfc', '--icon-faint': '#c3c9cf', '--pill-bg': '#e3f3e9', '--pill-text': '#2e8b57', '--danger': '#e24c4c', '--danger-bg': '#ffffff', '--danger-border': '#f3c9c9', '--accent': '#2490EF' },
  dark: { '--bg': '#15181d', '--surface': '#1f242b', '--surface-2': '#2a3039', '--border': '#2e343d', '--border-2': '#3a414b', '--divider': '#2a3039', '--text': '#e9ebee', '--text-2': '#c3c9d0', '--muted': '#9097a0', '--muted-2': '#747c86', '--hover': '#2a3039', '--shadow': 'rgba(0,0,0,.35)', '--inset': '#23282f', '--icon-faint': '#4a525c', '--pill-bg': '#16331f', '--pill-text': '#5fcf86', '--danger': '#f08a8a', '--danger-bg': '#2e2122', '--danger-border': '#5c3a3a', '--accent': '#2490EF' },
};

// أيقونات Feather مضمّنة
const ico = (paths, o = {}) => (
  <svg width={o.s || 16} height={o.s || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={o.w || 2} strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
);
const I = {
  dash: ico(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>),
  users: ico(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>),
  gear: ico(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  logout: ico(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>),
  sun: ico(<><circle cx="12" cy="12" r="4.2" /><line x1="12" y1="2" x2="12" y2="4.5" /><line x1="12" y1="19.5" x2="12" y2="22" /><line x1="4" y1="12" x2="2" y2="12" /><line x1="22" y1="12" x2="20" y2="12" /><line x1="5.5" y1="5.5" x2="7" y2="7" /><line x1="17" y1="17" x2="18.5" y2="18.5" /><line x1="18.5" y1="5.5" x2="17" y2="7" /><line x1="7" y1="17" x2="5.5" y2="18.5" /></>, { s: 17 }),
  moon: ico(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />),
  search: ico(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>, { s: 14 }),
  plus: ico(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, { s: 14, w: 2.3 }),
  chevron: ico(<polyline points="6 9 12 15 18 9" />, { w: 2.2 }),
  leaf: ico(<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />, { w: 1.7, s: 30 }),
  image: ico(<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>, { w: 1.7, s: 30 }),
};

async function api(path, opts, t) {
  const res = await fetch(`/api/control${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const json = await res.json().catch(() => ({ ok: false, error: t.invalidResp }));
  if (!json.ok) throw new Error(json.error || t.err);
  return json.data;
}

function fmtBytes(n) {
  n = Number(n) || 0;
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB']; let i = -1;
  do { n /= 1024; i += 1; } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n >= 100 ? 0 : 1)} ${u[i]}`;
}
function fmtUptime(sec) {
  sec = Number(sec) || 0;
  const d = Math.floor(sec / 86400); const h = Math.floor((sec % 86400) / 3600); const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}
const LEVEL_COLOR = { good: 'var(--pill-text)', moderate: '#d9822b', heavy: 'var(--danger)' };

// ===== حوارات داخل التطبيق (بديل window.confirm/prompt/alert الذي يكتمه Firefox) =====
let _dialog = null;
function confirmDialog(message, t) {
  if (_dialog) return _dialog({ type: 'confirm', message, ok: t.okBtn, cancel: t.cancelBtn });
  return Promise.resolve(window.confirm(message));
}
function promptDialog(message, t, password = false) {
  if (_dialog) return _dialog({ type: 'prompt', message, password, ok: t.okBtn, cancel: t.cancelBtn });
  return Promise.resolve(window.prompt(message));
}
function notify(message) {
  if (_dialog) return _dialog({ type: 'notify', message });
  return Promise.resolve();
}

function DialogHost() {
  const [d, setD] = useState(null);
  const [val, setVal] = useState('');
  const [toast, setToast] = useState('');
  useEffect(() => {
    _dialog = (opts) => {
      if (opts.type === 'notify') { setToast(opts.message); setTimeout(() => setToast(''), 3500); return Promise.resolve(); }
      return new Promise((resolve) => { setVal(''); setD({ ...opts, resolve }); });
    };
    return () => { _dialog = null; };
  }, []);
  const finish = (v) => { const r = d?.resolve; setD(null); if (r) r(v); };
  return (
    <>
      {toast && <div style={S.toast} onClick={() => setToast('')}>{toast}</div>}
      {d && (
        <div style={S.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) finish(d.type === 'prompt' ? null : false); }}>
          <div style={S.confirmBox}>
            <div style={S.confirmMsg}>{d.message}</div>
            {d.type === 'prompt' && (
              <input autoFocus type={d.password ? 'password' : 'text'} style={{ ...S.input, marginTop: 12 }}
                value={val} onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') finish(val || null); }} />
            )}
            <div style={S.confirmBtns}>
              <button style={S.primaryBtn} onClick={() => finish(d.type === 'prompt' ? (val || null) : true)}>{d.ok || 'OK'}</button>
              <button style={S.secBtn} onClick={() => finish(d.type === 'prompt' ? null : false)}>{d.cancel || 'Cancel'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ControlPanel() {
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('light');
  const [me, setMe] = useState(null);
  const [featureKeys, setFeatureKeys] = useState([]);
  const [ctrlPerms, setCtrlPerms] = useState([]);
  const [view, setView] = useState('dashboard');
  const [brand, setBrand] = useState(null);
  const [error, setError] = useState('');
  const t = T[lang];

  const loadBrand = useCallback(async () => {
    try { setBrand(await api('/branding/manifest', undefined, T.ar)); } catch { /* تجاهل */ }
  }, []);

  useEffect(() => {
    const sl = localStorage.getItem('controlLang'); if (sl === 'ar' || sl === 'en') setLang(sl);
    const th = localStorage.getItem('controlTheme'); if (th === 'light' || th === 'dark') setTheme(th);
    loadBrand();
  }, [loadBrand]);

  useEffect(() => {
    if (!brand?.favicon) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = `/api/control/branding/asset/favicon?v=${brand.ts || ''}`;
  }, [brand]);

  useEffect(() => {
    (async () => {
      try {
        const info = await api('/me', undefined, T.ar);
        setMe(info.admin); setFeatureKeys(info.featureKeys || []); setCtrlPerms(info.controlPermissions || []);
        const p = info.admin.permissions || [];
        setView(p.includes('view_dashboard') ? 'dashboard' : p.includes('manage_tenants') ? 'customers'
          : (p.includes('manage_admins') || p.includes('manage_branding')) ? 'settings' : 'none');
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
  const nav = [
    { key: 'dashboard', label: t.nav.dashboard, icon: I.dash, show: can('view_dashboard') },
    { key: 'customers', label: t.nav.customers, icon: I.users, show: can('manage_tenants') },
    { key: 'settings', label: t.nav.settings, icon: I.gear, show: can('manage_admins') || can('manage_branding') },
  ].filter((i) => i.show);
  const crumb = nav.find((i) => i.key === view)?.label || '';
  const avatarLetter = (me?.username || 'R')[0].toUpperCase();

  return (
    <div dir={t.dir} style={{ ...THEME[theme], ...(brand?.accent ? { '--accent': brand.accent } : {}), ...S.app }}>
      <DialogHost />
      {/* ===== Navbar ===== */}
      <nav style={S.navbar}>
        <div style={S.brandBox}>
          {brand?.logo
            ? <img src={`/api/control/branding/asset/logo?v=${brand.ts || ''}`} alt="logo" style={S.brandImg} />
            : <><div style={S.logoSq}><span style={{ color: '#fff', display: 'flex' }}>{I.leaf}</span></div><span style={S.brandName}>SaaS</span></>}
        </div>
        <div style={S.searchWrap}>
          <span style={S.searchIcon}>{I.search}</span>
          <input style={S.search} placeholder={t.search} readOnly />
        </div>
        <div style={S.navRight}>
          <button style={S.iconBtn} onClick={toggleTheme} title="theme">{theme === 'light' ? I.moon : I.sun}</button>
          <button style={S.langBtn} onClick={toggleLang}>{t.langBtn}</button>
          <div style={S.avatar}>{avatarLetter}</div>
        </div>
      </nav>

      <div style={S.body}>
        {/* ===== Sidebar ===== */}
        <aside style={S.sidebar}>
          <div style={S.wsHeader}>{t.workspaces}</div>
          {nav.map((i) => (
            <div key={i.key} onClick={() => setView(i.key)}
              style={{ ...S.navItem, ...(view === i.key ? { color: 'var(--accent)', fontWeight: 600, background: 'color-mix(in srgb, var(--accent) 13%, var(--surface))' } : {}) }}>
              <span style={S.navIcon}>{i.icon}</span><span>{i.label}</span>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <div style={S.sideDivider} />
          <div style={S.navItem} onClick={logout}><span style={S.navIcon}>{I.logout}</span><span>{t.logout}</span></div>
        </aside>

        {/* ===== Main ===== */}
        <main style={S.main}>
          <div style={S.crumb}><span>{t.crumbHome}</span><span style={{ color: 'var(--border-2)' }}>›</span><span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{crumb}</span></div>
          {error && <div style={S.errorBar} onClick={() => setError('')}>{error} ✕</div>}
          {view === 'none' && <div style={S.empty}>{t.noAccess}</div>}
          {view === 'dashboard' && <DashboardView t={t} onError={setError} />}
          {view === 'customers' && <ClientsView t={t} featureKeys={featureKeys} onError={setError} />}
          {view === 'settings' && <SettingsView t={t} can={can} ctrlPerms={ctrlPerms} meId={me?.id} onError={setError} onBrandChange={loadBrand} />}
        </main>
      </div>
    </div>
  );
}

// ================= Dashboard =================
function DashboardView({ t, onError }) {
  const [s, setS] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [sel, setSel] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [sys, setSys] = useState(null);
  useEffect(() => {
    api('/stats', undefined, t).then(setS).catch((e) => onError(e.message));
    api('/tenants', undefined, t).then((d) => setTenants(d.items || [])).catch(() => {});
    api('/system', undefined, t).then(setSys).catch(() => {});
  }, []); // eslint-disable-line
  function pick(slug) {
    setSel(slug); setMetrics(null);
    if (slug) api(`/tenants/${slug}/metrics`, undefined, t).then(setMetrics).catch((e) => onError(e.message));
  }
  if (!s) return <div style={S.empty}>…</div>;
  const cards = [
    { label: t.dash.projects, value: s.projects },
    { label: t.dash.users, value: s.users },
    { label: t.dash.suspended, value: s.byStatus?.suspended || 0 },
    { label: t.dash.active, value: s.byStatus?.active || 0 },
    { label: t.dash.tenants, value: s.total },
  ];
  const plans = Object.entries(s.byPlan || {});
  const totalPlan = plans.reduce((a, [, n]) => a + n, 0) || 1;
  return (
    <>
      <h1 style={S.h1}>{t.dash.title}</h1>
      <div style={S.statGrid}>
        {cards.map((c) => (
          <div key={c.label} style={S.statCard}><div style={S.statLbl}>{c.label}</div><div style={S.statVal}>{c.value}</div></div>
        ))}
      </div>

      <div style={S.dashRow}>
        {/* ===== Customer Insights ===== */}
        {tenants.length > 0 && (
          <div style={S.insightCard}>
            <div style={S.cardTitle}>{t.dash.insights}</div>
            <select style={{ ...S.inputLg, marginBottom: 14 }} value={sel} onChange={(e) => pick(e.target.value)}>
              <option value="">{t.dash.selectCustomer}</option>
              {tenants.map((tn) => <option key={tn.slug} value={tn.slug}>{tn.name} ({tn.slug})</option>)}
            </select>
            {sel && !metrics && <div style={S.muted}>…</div>}
            {metrics && (
              <>
                <div style={S.miniGrid}>
                  <Mini label={t.dash.totalSize} value={fmtBytes(metrics.totalBytes)} />
                  <Mini label={t.dash.tablesLbl} value={metrics.tables} />
                  <Mini label={t.dash.rowsApprox} value={Number(metrics.rows).toLocaleString()} />
                  <Mini label={t.dash.dataSize} value={fmtBytes(metrics.dataBytes)} />
                  <Mini label={t.dash.indexSize} value={fmtBytes(metrics.indexBytes)} />
                  <Mini label={t.dash.perf} value={<span style={{ ...S.levelBadge, color: LEVEL_COLOR[metrics.level], borderColor: LEVEL_COLOR[metrics.level] }}>{t.dash[metrics.level === 'good' ? 'levelGood' : metrics.level === 'moderate' ? 'levelModerate' : 'levelHeavy']}</span>} />
                </div>
                {metrics.top?.length > 0 && (
                  <>
                    <div style={{ ...S.fieldLabel, marginTop: 14 }}>{t.dash.topTables}</div>
                    <div style={S.colGapSm}>
                      {metrics.top.map((tb) => (
                        <div key={tb.name} style={S.rowItem}>
                          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{tb.name}</span>
                          <span style={S.muted}>{fmtBytes(tb.size)} · {Number(tb.rows).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== Platform Resources ===== */}
        <div style={S.insightCard}>
          <div style={S.cardTitle}>{t.dash.platformRes} <span style={S.muted}>· {t.dash.sharedNote}</span></div>
          {sys?.docker?.available ? (
            <>
              <div style={S.miniGrid}>
                <Mini label={t.dash.cores} value={sys.docker.host.cpus} />
                <Mini label={t.dash.totalCpu} value={`${sys.docker.totalCpu.toFixed(1)}%`} />
                <Mini label={t.dash.ramTotal} value={fmtBytes(sys.docker.host.memTotal)} />
                <Mini label={t.dash.ramUsedC} value={fmtBytes(sys.docker.totalMem)} />
                <Mini label={t.dash.disk} value={sys.docker.host.disk != null ? fmtBytes(sys.docker.host.disk) : '—'} />
                <Mini label={t.dash.containersLbl} value={`${sys.docker.host.running}/${sys.docker.host.containers}`} />
                <Mini label={t.dash.images} value={sys.docker.host.images} />
                <Mini label={t.dash.version} value={sys.docker.host.version} />
              </div>
              <div style={{ ...S.colGapSm, marginTop: 12 }}>
                {sys.docker.containers.map((c) => (
                  <div key={c.name} style={{ marginBottom: 6 }}>
                    <div style={S.resHead}><span>{c.name}</span><span style={S.muted}>{c.cpu.toFixed(1)}% · {fmtBytes(c.mem)}{c.memLimit ? ` / ${fmtBytes(c.memLimit)}` : ''}</span></div>
                    <div style={S.resTrack}><div style={{ width: `${Math.min(100, c.cpu)}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} /></div>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={S.muted}>{t.dash.dockerOff}</div>}

          {sys?.mysql && (
            <>
              <div style={{ ...S.cardTitle, marginTop: 16 }}>{t.dash.mysqlPerf}</div>
              <div style={S.miniGrid}>
                <Mini label={t.dash.connections} value={sys.mysql.threadsConnected} />
                <Mini label={t.dash.running} value={sys.mysql.threadsRunning} />
                <Mini label={t.dash.qps} value={sys.mysql.qps.toFixed(1)} />
                <Mini label={t.dash.bufferPool} value={`${sys.mysql.bufferPoolUsedPct.toFixed(0)}%`} />
                <Mini label={t.dash.slowQ} value={sys.mysql.slowQueries} />
                <Mini label={t.dash.uptimeLbl} value={fmtUptime(sys.mysql.uptime)} />
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ ...S.planCard, marginTop: 18 }}>
        <div style={S.cardTitle}>{t.dash.byPlan}</div>
        <div style={S.barTrack}>
          {plans.map(([p, n]) => <div key={p} style={{ width: `${(n / totalPlan) * 100}%`, background: PLAN_COLORS[p] || '#a9d2f7' }} />)}
        </div>
        <div style={S.legendRow}>
          {plans.map(([p, n]) => (
            <div key={p} style={S.legend}><span style={{ ...S.swatch, background: PLAN_COLORS[p] || '#a9d2f7' }} /><span style={{ color: 'var(--text-2)' }}>{p}</span><b>{n}</b></div>
          ))}
        </div>
      </div>
    </>
  );
}

function Mini({ label, value }) {
  return <div style={S.mini}><div style={S.miniLbl}>{label}</div><div style={S.miniVal}>{value}</div></div>;
}

// ================= Customers =================
function ClientsView({ t, featureKeys, onError }) {
  const [tenants, setTenants] = useState([]);
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    try { const list = await api('/tenants', undefined, t); setTenants(list.items || []); } catch (e) { onError(e.message); }
  }, [t, onError]);
  useEffect(() => { reload(); }, [reload]);
  return (
    <>
      <div style={S.custHead}>
        <h1 style={S.h1}>{t.cust.title}</h1>
        <AddTenant t={t} featureKeys={featureKeys} busy={busy} setBusy={setBusy} onDone={reload} onError={onError} />
      </div>
      <div style={S.cardGrid}>
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
        maxUsers: f.maxUsers === '' ? null : Number(f.maxUsers), maxProjects: f.maxProjects === '' ? null : Number(f.maxProjects),
        features: featureKeys.reduce((a, k) => ({ ...a, [k]: features[k] !== false }), {}),
      }) }, t);
      setF({ name: '', slug: '', adminPassword: '', plan: 'trial', maxUsers: '', maxProjects: '' }); setFeatures({}); setOpen(false); await onDone();
    } catch (e2) { onError(e2.message); } finally { setBusy(false); }
  }
  return (
    <>
      <button style={S.primaryBtn} onClick={() => setOpen(true)}><span style={S.btnIcon}>{I.plus}</span>{t.cust.add}</button>
      {open && (
        <div style={S.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <form onSubmit={submit} style={S.modal}>
            <div style={S.modalHead}><strong>{t.cust.addTitle}</strong><button type="button" style={S.xBtn} onClick={() => setOpen(false)}>✕</button></div>
            <div style={S.modalBody}>
              <div style={S.section}>
                <div style={S.sectionTitle}>{t.cust.secBasic}</div>
                <div style={S.formGrid}>
                  <Field label={t.cust.orgName}><input style={S.input} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Acme Inc" /></Field>
                  <Field label={t.cust.slug}><input style={S.input} value={f.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} placeholder="acme" required /></Field>
                  <Field label={t.cust.adminPw}><input style={S.input} value={f.adminPassword} onChange={(e) => set('adminPassword', e.target.value)} placeholder="••••••" required /></Field>
                </div>
              </div>
              <div style={S.section}>
                <div style={S.sectionTitle}>{t.cust.secPlan}</div>
                <div style={S.formGrid}>
                  <Field label={t.cust.plan}><select style={S.input} value={f.plan} onChange={(e) => set('plan', e.target.value)}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
                  <Field label={t.cust.maxUsers}><input style={S.input} type="number" min="1" value={f.maxUsers} onChange={(e) => set('maxUsers', e.target.value)} placeholder="∞" /></Field>
                  <Field label={t.cust.maxProjects}><input style={S.input} type="number" min="1" value={f.maxProjects} onChange={(e) => set('maxProjects', e.target.value)} placeholder="∞" /></Field>
                </div>
              </div>
              <div style={S.section}>
                <div style={S.sectionTitle}>{t.cust.features}</div>
                <div style={S.featRow}>{featureKeys.map((k) => <label key={k} style={S.check}><input type="checkbox" style={S.cbox} checked={features[k] !== false} onChange={(e) => setFeatures((s) => ({ ...s, [k]: e.target.checked }))} /> {k}</label>)}</div>
              </div>
            </div>
            <div style={S.modalFoot}><button style={S.primaryBtn} disabled={busy}>{busy ? '…' : t.cust.create}</button><button type="button" style={S.secBtn} onClick={() => setOpen(false)}>{t.cust.cancel}</button></div>
          </form>
        </div>
      )}
    </>
  );
}

function TenantCard({ t, tenant, featureKeys, onChanged, onError }) {
  const [tn, setTn] = useState(tenant);
  const [open, setOpen] = useState(false);
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
    const pw = await promptDialog(t.newPwFor(tn.slug), t, true); if (!pw) return;
    setSaving(true); onError('');
    try { await api(`/tenants/${tn.slug}/admin`, { method: 'POST', body: JSON.stringify({ password: pw }) }, t); notify(t.pwUpdated); }
    catch (e) { onError(e.message); notify(e.message); } finally { setSaving(false); }
  }
  async function remove() {
    if (!(await confirmDialog(t.confirmDelClient(tn.name), t))) return;
    setSaving(true); onError('');
    try { await api(`/tenants/${tn.slug}`, { method: 'DELETE', body: JSON.stringify({ confirm: tn.slug }) }, t); await onChanged(); }
    catch (e) { onError(e.message); notify(e.message); } finally { setSaving(false); }
  }
  const active = tn.status === 'active';
  return (
    <div style={S.card}>
      <div style={S.cardHead} onClick={() => setOpen((o) => !o)}>
        <div style={S.cardHeadLeft}>
          <span style={{ ...S.chev, transform: open ? 'rotate(0)' : 'rotate(-90deg)' }}>{I.chevron}</span>
          <div style={{ minWidth: 0 }}>
            <div style={S.cardName}>{tn.name}</div>
            <div style={S.cardMeta}>{t.cust.db} {tn.dbName}</div>
          </div>
        </div>
        <div style={S.cardHeadRight}>
          <span style={S.planChip}>{tn.plan}</span>
          <span style={{ ...S.pill, background: active ? 'var(--pill-bg)' : 'var(--danger-bg)', color: active ? 'var(--pill-text)' : 'var(--danger)', borderColor: active ? 'transparent' : 'var(--danger-border)' }}>{active ? t.cust.active : t.cust.suspended}</span>
        </div>
      </div>
      {open && (
        <div style={S.cardBody}>
          <div style={S.grid2}>
            <Field label={t.cust.plan}><select style={S.input} value={tn.plan} onChange={(e) => setTn({ ...tn, plan: e.target.value })}>{PLANS.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
            <Field label={t.cust.maxUsers}><input style={S.input} type="number" value={tn.maxUsers ?? ''} onChange={(e) => setTn({ ...tn, maxUsers: e.target.value })} placeholder="∞" /></Field>
          </div>
          <Field label={t.cust.maxProjects}><input style={S.input} type="number" value={tn.maxProjects ?? ''} onChange={(e) => setTn({ ...tn, maxProjects: e.target.value })} placeholder="∞" /></Field>
          <div style={S.featRow}>{featureKeys.map((k) => <label key={k} style={S.check}><input type="checkbox" style={S.cbox} checked={tn.features?.[k] !== false} onChange={(e) => setTn({ ...tn, features: { ...tn.features, [k]: e.target.checked } })} /> {k}</label>)}</div>
          <div style={S.btnRow}>
            <button style={S.primaryBtnSm} disabled={saving} onClick={saveLimits}>{t.cust.save}</button>
            <button style={S.secBtn} disabled={saving} onClick={toggleStatus}>{active ? t.cust.suspend : t.cust.active}</button>
            <button style={S.secBtn} disabled={saving} onClick={() => setManaging((m) => !m)}>{t.cust.manage}</button>
            <button style={S.secBtn} disabled={saving} onClick={resetAdmin}>{t.cust.adminPw}</button>
            <button style={S.dangerBtn} disabled={saving} onClick={remove}>{t.cust.del}</button>
          </div>
          {managing && <ManageTenant t={t} slug={tn.slug} onError={onError} />}
        </div>
      )}
    </div>
  );
}

function ManageTenant({ t, slug, onError }) {
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [groups, setGroups] = useState([]);
  const [uf, setUf] = useState({ username: '', email: '', password: '', roleIds: [] });
  const [rf, setRf] = useState({ name: '', permissions: [] });
  const lk = t.dir === 'rtl' ? 'labelAr' : 'labelEn';
  const loadUsers = useCallback(async () => { try { const d = await api(`/tenants/${slug}/users`, undefined, t); setUsers(d.items || []); } catch (e) { onError(e.message); } }, [slug, t, onError]);
  const loadRoles = useCallback(async () => { try { const d = await api(`/tenants/${slug}/roles`, undefined, t); setRoles(d.items || []); setCatalog(d.catalog || []); setGroups(d.groups || []); } catch (e) { onError(e.message); } }, [slug, t, onError]);
  const togglePerm = (key, on) => setRf((s) => ({ ...s, permissions: on ? [...s.permissions, key] : s.permissions.filter((k) => k !== key) }));
  useEffect(() => { loadUsers(); loadRoles(); }, [loadUsers, loadRoles]);
  async function addUser(e) { e.preventDefault(); onError(''); try { await api(`/tenants/${slug}/users`, { method: 'POST', body: JSON.stringify({ ...uf, roleIds: uf.roleIds.map(Number) }) }, t); setUf({ username: '', email: '', password: '', roleIds: [] }); await loadUsers(); } catch (e2) { onError(e2.message); notify(e2.message); } }
  async function addRole(e) { e.preventDefault(); onError(''); try { await api(`/tenants/${slug}/roles`, { method: 'POST', body: JSON.stringify(rf) }, t); setRf({ name: '', permissions: [] }); await loadRoles(); } catch (e2) { onError(e2.message); notify(e2.message); } }
  async function delUser(u) { if (!(await confirmDialog(t.confirmUser(u.username), t))) return; onError(''); try { await api(`/tenants/${slug}/users/${u.id}`, { method: 'DELETE' }, t); await loadUsers(); } catch (e) { onError(e.message); notify(e.message); } }
  async function delRole(r) { if (!(await confirmDialog(t.confirmRole(r.name), t))) return; onError(''); try { await api(`/tenants/${slug}/roles/${r.id}`, { method: 'DELETE' }, t); await loadRoles(); } catch (e) { onError(e.message); notify(e.message); } }

  return (
    <div style={S.manageBox}>
      <div style={S.segmented}>
        <button style={{ ...S.seg, ...(tab === 'users' ? S.segOn : {}) }} onClick={() => setTab('users')}>{t.cust.users}</button>
        <button style={{ ...S.seg, ...(tab === 'roles' ? S.segOn : {}) }} onClick={() => setTab('roles')}>{t.cust.roles}</button>
      </div>
      {tab === 'users' ? (
        <form onSubmit={addUser} style={S.colGap}>
          <input style={S.input} placeholder={t.cust.username} value={uf.username} onChange={(e) => setUf({ ...uf, username: e.target.value })} required />
          <input style={S.input} placeholder={t.cust.email} value={uf.email} onChange={(e) => setUf({ ...uf, email: e.target.value })} />
          <input style={S.input} type="password" placeholder={t.cust.password} value={uf.password} onChange={(e) => setUf({ ...uf, password: e.target.value })} required />
          {roles.length > 0 && (
            <select multiple style={{ ...S.input, height: 'auto', minHeight: 34, padding: 6 }} value={uf.roleIds.map(String)} onChange={(e) => setUf({ ...uf, roleIds: Array.from(e.target.selectedOptions, (o) => o.value) })}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <button style={S.primaryBtnSm}><span style={S.btnIcon}>{I.plus}</span>{t.cust.addUser}</button>
          <div style={S.colGapSm}>
            {users.length ? users.map((u) => (
              <div key={u.id} style={S.rowItem}>
                <span style={{ fontSize: 12.5, color: 'var(--text)' }}><strong>{u.username}</strong> <span style={{ color: 'var(--muted-2)', fontSize: 11 }}>{(u.roles || []).map((r) => r.name).join(', ')}</span></span>
                <button type="button" style={S.xSmall} onClick={() => delUser(u)}>✕</button>
              </div>
            )) : <div style={S.muted}>{t.cust.noUsers}</div>}
          </div>
        </form>
      ) : (
        <form onSubmit={addRole} style={S.colGap}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...S.input, flex: 1 }} placeholder={t.cust.roleName} value={rf.name} onChange={(e) => setRf({ ...rf, name: e.target.value })} required />
            <button style={S.primaryBtnSm}><span style={S.btnIcon}>{I.plus}</span>{t.cust.addRole}</button>
          </div>
          <div style={S.permScroll}>
            {(groups.length ? groups : [{ key: '_', labelAr: '', labelEn: '' }]).map((g) => {
              const items = catalog.filter((p) => (g.key === '_' ? true : p.group === g.key));
              if (!items.length) return null;
              const allOn = items.every((p) => rf.permissions.includes(p.key));
              return (
                <div key={g.key} style={S.permGroup}>
                  {g.key !== '_' && (
                    <div style={S.permGroupHead}>
                      <span>{g[lk]}</span>
                      <button type="button" style={S.permAll} onClick={() => items.forEach((p) => togglePerm(p.key, !allOn))}>{allOn ? '—' : '✓'}</button>
                    </div>
                  )}
                  {items.map((p) => (
                    <label key={p.key} style={S.permRow} title={p.key}>
                      <span style={S.permLabel}>{p[lk] || p.key}</span>
                      <input type="checkbox" style={S.cbox} checked={rf.permissions.includes(p.key)} onChange={(e) => togglePerm(p.key, e.target.checked)} />
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
          <div style={S.colGapSm}>
            {roles.length ? roles.map((r) => (
              <div key={r.id} style={S.rowItem}>
                <span style={{ fontSize: 12.5 }}><strong>{r.name}</strong> <span style={S.muted}>{r.description || ''}</span></span>
                <button type="button" style={S.xSmall} onClick={() => delRole(r)}>✕</button>
              </div>
            )) : <div style={S.muted}>{t.cust.noRoles}</div>}
          </div>
        </form>
      )}
    </div>
  );
}

// ================= Settings =================
function SettingsView({ t, can, ctrlPerms, meId, onError, onBrandChange }) {
  const tabs = [
    can('manage_branding') && { key: 'identity', label: t.set.tabIdentity },
    can('manage_admins') && { key: 'supervisors', label: t.set.tabSupervisors },
    can('manage_admins') && { key: 'permissions', label: t.set.tabPermissions },
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0]?.key || 'identity');
  return (
    <>
      <h1 style={S.h1}>{t.set.title}</h1>
      <div style={S.tabBar}>{tabs.map((x) => <button key={x.key} style={{ ...S.tab, ...(tab === x.key ? S.tabOn : {}) }} onClick={() => setTab(x.key)}>{x.label}</button>)}</div>
      {tab === 'identity' && <BrandingTab t={t} onError={onError} onBrandChange={onBrandChange} />}
      {(tab === 'supervisors' || tab === 'permissions') && <AdminsTab t={t} ctrlPerms={ctrlPerms} meId={meId} permsMode={tab === 'permissions'} onError={onError} />}
    </>
  );
}

function BrandingTab({ t, onError, onBrandChange }) {
  const [s, setS2] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { api('/settings', undefined, t).then(setS2).catch((e) => onError(e.message)); }, []); // eslint-disable-line
  if (!s) return <div style={S.empty}>…</div>;
  async function save(e) {
    e.preventDefault(); onError(''); setSaved(false);
    try { const d = await api('/settings', { method: 'PUT', body: JSON.stringify({ platformName: s.platformName, accent: s.accent }) }, t); setS2({ ...s, ...d }); setSaved(true); onBrandChange?.(); }
    catch (e2) { onError(e2.message); }
  }
  return (
    <form onSubmit={save} style={S.identityCol}>
      <Field label={t.set.platformName}><input style={S.inputLg} value={s.platformName} onChange={(e) => setS2({ ...s, platformName: e.target.value })} /></Field>
      <div>
        <label style={S.fieldLabel}>{t.set.primaryColor}</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="color" value={s.accent || '#2490EF'} onChange={(e) => setS2({ ...s, accent: e.target.value })} style={S.colorInput} />
          <input style={{ ...S.inputLg, width: 120, fontFamily: 'ui-monospace, monospace' }} value={s.accent || ''} onChange={(e) => setS2({ ...s, accent: e.target.value })} />
        </div>
      </div>
      <div style={S.btnRow}><button style={S.primaryBtn}>{t.set.save}</button>{saved && <span style={S.savedMsg}>{t.set.saved}</span>}</div>
      <div style={S.uploadGrid}>
        <ImageUpload t={t} label={t.set.logo} type="logo" onError={onError} onChange={onBrandChange} />
        <ImageUpload t={t} label={t.set.favicon} type="favicon" onError={onError} onChange={onBrandChange} />
        <ImageUpload t={t} label={t.set.loginBg} type="login_background" wide onError={onError} onChange={onBrandChange} />
      </div>
    </form>
  );
}

function ImageUpload({ t, label, type, wide, onError, onChange }) {
  const [ver, setVer] = useState(() => Date.now());
  const [exists, setExists] = useState(true);
  const [busy, setBusy] = useState(false);
  async function upload(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); onError('');
    try { const fd = new FormData(); fd.append('file', file); const res = await fetch(`/api/control/branding/${type}`, { method: 'POST', body: fd }); const j = await res.json(); if (!j.ok) throw new Error(j.error || t.err); setExists(true); setVer(Date.now()); onChange?.(); }
    catch (e2) { onError(e2.message); notify(e2.message); } finally { setBusy(false); e.target.value = ''; }
  }
  async function remove() {
    setBusy(true); onError('');
    try { const res = await fetch(`/api/control/branding/${type}`, { method: 'DELETE' }); const j = await res.json(); if (!j.ok) throw new Error(j.error || t.err); setExists(false); setVer(Date.now()); onChange?.(); }
    catch (e2) { onError(e2.message); } finally { setBusy(false); }
  }
  return (
    <div style={{ ...S.uploadCard, ...(wide ? { gridColumn: 'span 2', maxWidth: 300 } : {}) }}>
      <div style={S.fieldLabel}>{label}</div>
      <div style={S.dropzone}>
        {exists ? <img src={`/api/control/branding/asset/${type}?v=${ver}`} alt={type} style={S.dropImg} onError={() => setExists(false)} /> : <span style={{ color: 'var(--icon-faint)', display: 'flex' }}>{I.image}</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <label style={{ ...S.primaryBtnSm, flex: 1, justifyContent: 'center' }}>{busy ? t.set.uploading : t.set.choose}<input type="file" accept="image/*" onChange={upload} style={{ display: 'none' }} disabled={busy} /></label>
        <button type="button" style={S.secBtn} onClick={remove} disabled={busy}>{t.set.remove}</button>
      </div>
    </div>
  );
}

function AdminsTab({ t, ctrlPerms, meId, permsMode, onError }) {
  const [admins, setAdmins] = useState([]);
  const [nf, setNf] = useState({ username: '', fullName: '', password: '', permissions: [] });
  const reload = useCallback(async () => { try { const d = await api('/admins', undefined, t); setAdmins(d.items || []); } catch (e) { onError(e.message); } }, [t, onError]);
  useEffect(() => { reload(); }, [reload]);
  async function add(e) { e.preventDefault(); onError(''); try { await api('/admins', { method: 'POST', body: JSON.stringify(nf) }, t); setNf({ username: '', fullName: '', password: '', permissions: [] }); await reload(); } catch (e2) { onError(e2.message); notify(e2.message); } }
  async function savePerms(a) { try { await api(`/admins/${a.id}`, { method: 'PATCH', body: JSON.stringify({ permissions: a.permissions }) }, t); await reload(); } catch (e) { onError(e.message); } }
  async function toggleActive(a) { try { await api(`/admins/${a.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !a.isActive }) }, t); await reload(); } catch (e) { onError(e.message); } }
  async function del(a) { if (!(await confirmDialog(`${t.cust.del}: ${a.username}?`, t))) return; try { await api(`/admins/${a.id}`, { method: 'DELETE' }, t); await reload(); } catch (e) { onError(e.message); notify(e.message); } }
  const lk = t.dir === 'rtl' ? 'ar' : 'en';
  return (
    <div style={S.colGapLg}>
      {!permsMode && (
        <form onSubmit={add} style={S.adminFormCard}>
          <div style={S.grid3}>
            <Field label={t.set.supUsername}><input style={S.inputLg} value={nf.username} onChange={(e) => setNf({ ...nf, username: e.target.value })} required /></Field>
            <Field label={t.set.supFullName}><input style={S.inputLg} value={nf.fullName} onChange={(e) => setNf({ ...nf, fullName: e.target.value })} /></Field>
            <Field label={t.set.supPassword}><input style={S.inputLg} type="password" value={nf.password} onChange={(e) => setNf({ ...nf, password: e.target.value })} required /></Field>
          </div>
          <div style={S.permWrap}>{ctrlPerms.map((p) => <label key={p.key} style={S.check}><input type="checkbox" style={S.cbox} checked={nf.permissions.includes(p.key)} onChange={(e) => setNf((s) => ({ ...s, permissions: e.target.checked ? [...s.permissions, p.key] : s.permissions.filter((k) => k !== p.key) }))} /> {p[lk]}</label>)}</div>
          <button style={S.primaryBtn}><span style={S.btnIcon}>{I.plus}</span>{t.set.addSup}</button>
        </form>
      )}
      <div style={S.adminGrid}>
        {admins.map((a) => <AdminRow key={a.id} t={t} a={a} ctrlPerms={ctrlPerms} permsMode={permsMode} isSelf={a.id === meId} lk={lk} onSavePerms={savePerms} onToggle={toggleActive} onDel={del} />)}
      </div>
    </div>
  );
}

function AdminRow({ t, a, ctrlPerms, permsMode, isSelf, lk, onSavePerms, onToggle, onDel }) {
  const [perms, setPerms] = useState(a.permissions || []);
  useEffect(() => setPerms(a.permissions || []), [a]);
  return (
    <div style={S.adminCard}>
      <div style={S.cardHeadRow}><span style={S.adminName}>{a.username}</span><span style={{ ...S.pill, background: a.isActive ? 'var(--pill-bg)' : 'var(--danger-bg)', color: a.isActive ? 'var(--pill-text)' : 'var(--danger)', borderColor: a.isActive ? 'transparent' : 'var(--danger-border)' }}>{a.isActive ? t.cust.active : t.cust.suspended}</span></div>
      <div style={S.adminMeta}>{a.fullName || t.set.superAdmin}</div>
      {permsMode ? (
        <>
          <div style={S.permWrap}>{ctrlPerms.map((p) => <label key={p.key} style={S.check}><input type="checkbox" style={S.cbox} checked={perms.includes(p.key)} onChange={(e) => setPerms((s) => e.target.checked ? [...s, p.key] : s.filter((k) => k !== p.key))} /> {p[lk]}</label>)}</div>
          <div style={S.btnRow}><button style={S.primaryBtnSm} onClick={() => onSavePerms({ ...a, permissions: perms })}>{t.set.savePerms}</button></div>
        </>
      ) : (
        <div style={S.btnRow}>
          <button style={S.secBtn} onClick={() => onToggle(a)}>{a.isActive ? t.set.disable : t.set.enable}</button>
          {!isSelf && <button style={S.dangerBtn} onClick={() => onDel(a)}>{t.cust.del}</button>}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <label style={S.field}><span style={S.fieldLabel}>{label}</span>{children}</label>; }

const cardSh = { boxShadow: '0 1px 2px var(--shadow)' };
const S = {
  app: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13 },
  navbar: { display: 'flex', alignItems: 'center', gap: 14, height: 50, padding: '0 18px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  brandBox: { display: 'flex', alignItems: 'center', gap: 9, minWidth: 160 },
  logoSq: { width: 27, height: 27, borderRadius: 7, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(36,144,239,.4)' },
  brandImg: { maxHeight: 30, maxWidth: 140, objectFit: 'contain' },
  brandName: { fontWeight: 700, fontSize: 15, letterSpacing: '.2px', color: 'var(--text)' },
  searchWrap: { flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' },
  searchIcon: { position: 'absolute', insetInlineStart: 'calc(50% - 215px + 11px)', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-2)', pointerEvents: 'none', display: 'flex' },
  search: { width: '100%', maxWidth: 430, height: 34, padding: '0 12px', paddingInlineStart: 34, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface-2)', fontSize: 12.5, color: 'var(--text)', outline: 'none' },
  navRight: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 160, justifyContent: 'flex-end' },
  iconBtn: { width: 30, height: 30, border: 'none', background: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)' },
  langBtn: { height: 30, padding: '0 11px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 7, fontSize: 12, fontWeight: 500, color: 'var(--text-2)', cursor: 'pointer' },
  avatar: { width: 29, height: 29, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 },
  body: { flex: 1, display: 'flex', minHeight: 0 },
  sidebar: { width: 236, flexShrink: 0, background: 'var(--surface)', borderInlineEnd: '1px solid var(--border)', padding: '14px 11px', display: 'flex', flexDirection: 'column', gap: 3, overflow: 'auto' },
  wsHeader: { fontSize: 10.5, fontWeight: 600, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '.7px', padding: '4px 11px 9px' },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 11px', borderRadius: 7, fontSize: 13, cursor: 'pointer', color: 'var(--text-2)' },
  navIcon: { display: 'flex', color: 'inherit' },
  sideDivider: { height: 1, background: 'var(--divider)', margin: '6px 4px' },
  main: { flex: 1, overflow: 'auto', padding: '22px 28px 60px' },
  crumb: { fontSize: 12, color: 'var(--muted-2)', marginBottom: 16, display: 'flex', gap: 7, alignItems: 'center' },
  errorBar: { background: 'var(--danger)', color: '#fff', padding: '9px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13, marginBottom: 16 },
  empty: { color: 'var(--muted)', padding: 20 },
  h1: { fontSize: 21, fontWeight: 600, margin: '0 0 20px', letterSpacing: '-.2px', color: 'var(--text)' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 18 },
  statCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '17px 18px', ...cardSh },
  statLbl: { fontSize: 12, color: 'var(--muted)', marginBottom: 10, fontWeight: 500 },
  statVal: { fontSize: 28, fontWeight: 600, color: 'var(--text)', lineHeight: 1, letterSpacing: '-.5px' },
  dashRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 18 },
  insightCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: 18, ...cardSh },
  miniGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: 10 },
  mini: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 11px' },
  miniLbl: { fontSize: 10.5, color: 'var(--muted)', marginBottom: 4 },
  miniVal: { fontSize: 15, fontWeight: 600, color: 'var(--text)' },
  levelBadge: { fontSize: 12, fontWeight: 700, border: '1px solid', borderRadius: 6, padding: '1px 8px', display: 'inline-block' },
  resHead: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-2)', marginBottom: 4 },
  resTrack: { height: 7, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' },
  planCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: 20, maxWidth: 540, ...cardSh },
  cardTitle: { fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text)' },
  barTrack: { height: 9, borderRadius: 5, overflow: 'hidden', display: 'flex', background: 'var(--surface-2)' },
  legendRow: { display: 'flex', gap: 22, marginTop: 16, flexWrap: 'wrap' },
  legend: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 },
  swatch: { width: 9, height: 9, borderRadius: 3, display: 'inline-block' },
  custHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12 },
  cardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16, alignItems: 'start' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, ...cardSh },
  cardHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 10 },
  cardHeadLeft: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  chev: { display: 'flex', color: 'var(--muted)', transition: 'transform .18s' },
  cardName: { fontWeight: 600, fontSize: 14.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardMeta: { fontSize: 11, color: 'var(--muted-2)', marginTop: 3 },
  cardHeadRight: { display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 },
  planChip: { background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 6 },
  pill: { fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 11, whiteSpace: 'nowrap', border: '1px solid transparent' },
  cardBody: { display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 13, borderTop: '1px solid var(--divider)' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { fontSize: 11.5, color: 'var(--muted)', marginBottom: 5, display: 'block', fontWeight: 500 },
  input: { width: '100%', height: 34, padding: '0 10px', border: '1px solid var(--border-2)', borderRadius: 6, fontSize: 12.5, color: 'var(--text)', background: 'var(--surface)', outline: 'none' },
  inputLg: { width: '100%', height: 36, padding: '0 11px', border: '1px solid var(--border-2)', borderRadius: 7, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' },
  colorInput: { width: 46, height: 36, border: '1px solid var(--border-2)', borderRadius: 7, padding: 3, background: 'var(--surface)', cursor: 'pointer' },
  cbox: { accentColor: 'var(--accent)', width: 15, height: 15, cursor: 'pointer', margin: 0 },
  featRow: { display: 'flex', flexWrap: 'wrap', gap: 11, padding: '2px 0' },
  check: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' },
  btnRow: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  btnIcon: { display: 'inline-flex', marginInlineEnd: 5 },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: 0, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 15px', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(36,144,239,.35)' },
  primaryBtnSm: { display: 'inline-flex', alignItems: 'center', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 13px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-start' },
  secBtn: { background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border-2)', borderRadius: 6, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer' },
  dangerBtn: { background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)', borderRadius: 6, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer' },
  xSmall: { width: 24, height: 24, border: '1px solid var(--danger-border)', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, lineHeight: 1 },
  manageBox: { display: 'flex', flexDirection: 'column', gap: 14 },
  segmented: { display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 3, alignSelf: 'flex-start' },
  seg: { background: 'none', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12.5, cursor: 'pointer', color: 'var(--muted)' },
  segOn: { background: 'var(--surface)', color: 'var(--text)', fontWeight: 600, boxShadow: '0 1px 2px var(--shadow)' },
  colGap: { display: 'flex', flexDirection: 'column', gap: 9 },
  colGapSm: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 2 },
  colGapLg: { display: 'flex', flexDirection: 'column', gap: 20 },
  rowItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', border: '1px solid var(--divider)', borderRadius: 7 },
  muted: { color: 'var(--muted-2)', fontSize: 11 },
  permScroll: { maxHeight: 260, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid var(--divider)', borderRadius: 8, padding: 6 },
  permGroup: { display: 'flex', flexDirection: 'column' },
  permGroupHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.5px', padding: '8px 8px 4px', position: 'sticky', top: 0, background: 'var(--surface)' },
  permAll: { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-2)', fontSize: 11, width: 22, height: 20, cursor: 'pointer', lineHeight: 1 },
  permRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 9px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--text-2)' },
  permLabel: { color: 'var(--text)' },
  tabBar: { display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 },
  tab: { background: 'none', border: 'none', borderBottom: '2px solid transparent', padding: '0 0 12px', fontSize: 13.5, cursor: 'pointer', color: 'var(--muted)' },
  tabOn: { color: 'var(--accent)', borderBottomColor: 'var(--accent)', fontWeight: 600 },
  identityCol: { maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 18 },
  uploadGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 6 },
  uploadCard: { border: '1px solid var(--border)', borderRadius: 9, padding: 15, background: 'var(--surface)' },
  dropzone: { border: '1px dashed var(--border-2)', borderRadius: 8, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '11px 0', background: 'var(--inset)' },
  dropImg: { maxHeight: 64, maxWidth: '90%', objectFit: 'contain' },
  savedMsg: { color: 'var(--pill-text)', fontSize: 13 },
  adminFormCard: { border: '1px solid var(--border)', borderRadius: 10, padding: 20, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 18, ...cardSh },
  permWrap: { display: 'flex', flexWrap: 'wrap', gap: 18 },
  adminGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 },
  adminCard: { border: '1px solid var(--border)', borderRadius: 10, padding: 18, background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12, ...cardSh },
  cardHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  adminName: { fontWeight: 700, fontSize: 14, color: 'var(--text)' },
  adminMeta: { fontSize: 12, color: 'var(--muted-2)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 16 },
  modal: { width: 560, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,.3)' },
  modalHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 15 },
  xBtn: { background: 'none', color: 'var(--muted)', border: 'none', fontSize: 18, cursor: 'pointer', lineHeight: 1 },
  modalBody: { padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 18 },
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.6px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  modalFoot: { display: 'flex', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border)' },
  confirmBox: { width: 400, maxWidth: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,.3)' },
  confirmMsg: { fontSize: 14, color: 'var(--text)', lineHeight: 1.6 },
  confirmBtns: { display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' },
  toast: { position: 'fixed', top: 16, insetInlineStart: '50%', transform: 'translateX(-50%)', zIndex: 60, background: 'var(--text)', color: 'var(--bg)', padding: '10px 18px', borderRadius: 8, fontSize: 13, boxShadow: '0 8px 30px rgba(0,0,0,.35)', cursor: 'pointer', maxWidth: '90%' },
};
