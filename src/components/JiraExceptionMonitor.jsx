'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AdminPanel from './AdminPanel';
import { useBranding, backgroundStyle } from './branding';

// ===================================================================
//  مراقب جيرا — لوحة الاستثناءات (واجهة) · ثنائية اللغة AR/EN
//  نمط البيت (Frappe/ERPNext). تتغذّى بالكامل من مسارات /api.
// ===================================================================

const C = {
  bg: 'var(--c-bg)',
  card: 'var(--c-card)',
  border: 'var(--c-border)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  green: '#1f7a4d',
  red: '#e03636',
  amber: '#cb8a14',
  blue: '#2490ef',
  purple: '#7c4dff',
};

// ألوان أنواع الاستثناءات وحالات SLA (مستقلة عن اللغة)
const EXC_COLORS = { overdue: C.red, stagnant: C.amber, review: C.blue, unassigned: C.purple };
const SLA_COLORS = { breached: C.red, at_risk: C.amber, on_track: C.green };

// ------------------------------------------------------------------- i18n
const DICT = {
  ar: {
    dir: 'rtl',
    locale: 'ar-EG-u-nu-latn',
    other: 'English',
    title: 'مراقب جيرا — لوحة الاستثناءات',
    subtitle: 'ما يحتاج تدخّل المدير فقط — تحديث تلقائي كل بضع دقائق',
    tabOperational: 'تشغيلي',
    tabManagerial: 'إداري',
    tabAdmin: 'الإدارة',
    account: 'حسابي',
    logout: 'خروج',
    refresh: 'تحديث',
    lastSync: 'آخر مزامنة',
    never: 'لا يوجد',
    cOverdue: 'متأخر عن الاستحقاق',
    cStagnant: 'راكد > 3 أيام',
    cReview: 'مراجعة متأخرة',
    cUnassigned: 'بدون مسؤول',
    exceptions: 'الاستثناءات',
    from: 'من',
    to: 'إلى',
    clear: 'مسح',
    all: 'الكل',
    fAssignee: 'المسؤول',
    fProject: 'المشروع',
    fPriority: 'الأهمية',
    fStatus: 'الحالة',
    showing: (x, y) => `عرض ${x} من ${y}`,
    exportCsv: 'تصدير CSV',
    perPage: 'لكل صفحة',
    pageOf: (x, y) => `صفحة ${x} من ${y}`,
    prev: 'السابق',
    next: 'التالي',
    actions: 'إجراءات',
    act: '⋯',
    comment: 'تعليق',
    assign: 'إسناد',
    editFields: 'تعديل الحقول',
    commaSep: 'افصل بفواصل',
    transition: 'نقل الحالة',
    send: 'إرسال',
    apply: 'تطبيق',
    unassign: 'إلغاء الإسناد',
    pick: 'اختر…',
    actDone: 'تم بنجاح',
    close: 'إغلاق',
    followup: 'المتابعة',
    acknowledge: 'إقرار (رأيتها/أتابعها)',
    acked: 'مُقَرّ',
    snoozeUntil: 'تأجيل حتى',
    owner: 'المالك',
    rootCause: 'السبب الجذري',
    noteL: 'ملاحظة',
    hideSnoozed: 'إخفاء المؤجَّلة',
    hideAcked: 'إخفاء المُقَرّة',
    snoozed: 'مؤجَّل',
    saveFollowup: 'حفظ المتابعة',
    rc: { blocked: 'معطّل', waiting_client: 'بانتظار العميل', under_resourced: 'نقص موارد', dependency: 'اعتمادية', scope_change: 'تغيّر نطاق', other: 'أخرى' },
    thKey: 'المفتاح',
    thSummary: 'الملخّص',
    thStatus: 'الحالة',
    thPriority: 'الأولوية',
    thAssignee: 'المسؤول',
    thDue: 'الاستحقاق',
    thDays: 'أيام بالحالة',
    thReasons: 'الأسباب',
    noExceptions: 'لا استثناءات 🎉',
    workload: 'أعباء الفريق — أداة توازن، لا محاسبة فردية',
    overdueSuffix: (n) => ` (${n} متأخر)`,
    sTotal: 'إجمالي التذاكر',
    sOpen: 'مفتوحة',
    sDone: 'منجزة',
    sBreached: 'متجاوزة SLA',
    sAvgCycle: 'متوسط زمن الدورة (يوم)',
    trend: 'اتجاه الاستثناءات — آخر 30 يوماً',
    chartLines: 'خطوط', chartArea: 'مساحات', chartBars: 'أعمدة',
    trendEmpty: 'لا لقطات اتجاه بعد — تتراكم يومياً مع كل مزامنة.',
    trendCollecting: (n) => `الاتجاه يتراكم يومياً — يوجد ${n} يوم حتى الآن، يظهر الخط بعد يومين أو أكثر.`,
    performance: 'تقييم الأداء', perfNote: 'أداة توازن بنّاءة — الدرجات بسياق الحِمل، لا للمحاسبة الفردية.',
    perfAssignees: 'المسؤولون', perfTeams: 'المشاريع', score: 'الدرجة', colResolved: 'منجَز', colLoad: 'الحِمل', colPredict: 'الثبات', windowD: (d) => `آخر ${d} يوم`,
    scorecard: 'صحة المشاريع (RAG)',
    health: 'الصحة', onTime: 'التسليم بالموعد', colOpen: 'مفتوحة', colExc: 'استثناءات', colBreach: 'متجاوز SLA', colCycle: 'زمن الدورة',
    healthLabel: { red: 'حرِج', amber: 'تحذير', green: 'سليم' },
    flow: 'تدفّق العمل والاختناقات', wipByStage: 'العمل الجاري حسب المرحلة (العدد · متوسط العمر)', agingWip: 'أقدم العناصر العالقة',
    ageDays: 'عمر بالحالة',
    bottleneck: 'الاختناق', bottleneckTag: 'اختناق', items: 'عنصر', avgAgeLabel: 'متوسط العمر',
    stuckLabel: 'عالق', maxAgeLabel: 'أقصى عمر', projectBottlenecks: 'اختناقات المشاريع',
    wipOverTime: 'تدفّق العمل عبر الزمن', wipOther: 'أخرى', wipEmpty: 'تتراكم لقطات التدفّق يومياً مع كل مزامنة.',
    throughput: 'الإنتاجية والتنبؤ', weeklyDone: 'منجزة أسبوعياً', avgWeekly: 'متوسط أسبوعي',
    weeksUnit: 'أسبوع', byDate: 'بحلول', atPace: 'بالوتيرة الحالية',
    fcOpen: 'استنزاف المفتوحة', fcOverdue: 'استنزاف المتأخرة', fcBreach: 'استنزاف متجاوزات SLA', noForecast: 'يتعذّر التنبؤ (لا إنتاجية كافية)',
    sla: 'تنبؤ SLA',
    thRemaining: 'أيام متبقية',
    noAtRisk: 'لا تذاكر معرّضة 🎉',
    cycleByPriority: 'زمن الدورة حسب الأولوية (يوم)',
    stageResidence: 'زمن البقاء في كل مرحلة (يوم)',
    noStages: 'لا بيانات مراحل كافية بعد.',
    dayUnit: ' يوم',
    loading: '… جارٍ التحميل',
    loadError: 'تعذّر التحميل: ',
    exc: { overdue: 'متأخر', stagnant: 'راكد', review: 'مراجعة', unassigned: 'بدون مسؤول' },
    slaState: { breached: 'متجاوز', at_risk: 'معرّض للخطر', on_track: 'ضمن المهلة' },
  },
  en: {
    dir: 'ltr',
    locale: 'en-GB',
    other: 'العربية',
    title: 'Jira Monitor — Exceptions Board',
    subtitle: 'Only what needs a manager — auto-refreshed every few minutes',
    tabOperational: 'Operational',
    tabManagerial: 'Managerial',
    tabAdmin: 'Admin',
    account: 'Account',
    logout: 'Log out',
    refresh: 'Refresh',
    lastSync: 'Last sync',
    never: 'never',
    cOverdue: 'Overdue',
    cStagnant: 'Stagnant > 3 days',
    cReview: 'Late review',
    cUnassigned: 'Unassigned',
    exceptions: 'Exceptions',
    from: 'From',
    to: 'To',
    clear: 'Clear',
    all: 'All',
    fAssignee: 'Assignee',
    fProject: 'Project',
    fPriority: 'Priority',
    fStatus: 'Status',
    showing: (x, y) => `Showing ${x} of ${y}`,
    exportCsv: 'Export CSV',
    perPage: 'per page',
    pageOf: (x, y) => `Page ${x} of ${y}`,
    prev: 'Prev',
    next: 'Next',
    actions: 'Actions',
    act: '⋯',
    comment: 'Comment',
    assign: 'Assign',
    editFields: 'Edit fields',
    commaSep: 'comma-separated',
    transition: 'Transition',
    send: 'Send',
    apply: 'Apply',
    unassign: 'Unassign',
    pick: 'Select…',
    actDone: 'Done',
    close: 'Close',
    followup: 'Follow-up',
    acknowledge: 'Acknowledge (seen / on it)',
    acked: 'Acked',
    snoozeUntil: 'Snooze until',
    owner: 'Owner',
    rootCause: 'Root cause',
    noteL: 'Note',
    hideSnoozed: 'Hide snoozed',
    hideAcked: 'Hide acked',
    snoozed: 'Snoozed',
    saveFollowup: 'Save follow-up',
    rc: { blocked: 'Blocked', waiting_client: 'Waiting on client', under_resourced: 'Under-resourced', dependency: 'Dependency', scope_change: 'Scope change', other: 'Other' },
    thKey: 'Key',
    thSummary: 'Summary',
    thStatus: 'Status',
    thPriority: 'Priority',
    thAssignee: 'Assignee',
    thDue: 'Due',
    thDays: 'Days in status',
    thReasons: 'Reasons',
    noExceptions: 'No exceptions 🎉',
    workload: 'Team workload — a balancing tool, not individual blame',
    overdueSuffix: (n) => ` (${n} overdue)`,
    sTotal: 'Total tickets',
    sOpen: 'Open',
    sDone: 'Done',
    sBreached: 'SLA breached',
    sAvgCycle: 'Avg cycle time (days)',
    trend: 'Exceptions trend — last 30 days',
    chartLines: 'Lines', chartArea: 'Area', chartBars: 'Bars',
    trendEmpty: 'No trend snapshots yet — they accumulate daily with each sync.',
    trendCollecting: (n) => `Trend is building daily — ${n} day(s) so far; a line appears once there are 2+ days.`,
    performance: 'Performance evaluation', perfNote: 'A constructive balancing tool — scores shown in context of load, not for individual blame.',
    perfAssignees: 'Assignees', perfTeams: 'Projects', score: 'Score', colResolved: 'Resolved', colLoad: 'Load', colPredict: 'Consistency', windowD: (d) => `last ${d} days`,
    scorecard: 'Project health (RAG)',
    health: 'Health', onTime: 'On-time', colOpen: 'Open', colExc: 'Exceptions', colBreach: 'SLA breached', colCycle: 'Cycle time',
    healthLabel: { red: 'Critical', amber: 'Warning', green: 'Healthy' },
    flow: 'Flow & bottlenecks', wipByStage: 'WIP by stage (count · avg age)', agingWip: 'Oldest stuck items',
    ageDays: 'Age in status',
    bottleneck: 'Bottleneck', bottleneckTag: 'bottleneck', items: 'items', avgAgeLabel: 'avg age',
    stuckLabel: 'stuck', maxAgeLabel: 'max age', projectBottlenecks: 'Project bottlenecks',
    wipOverTime: 'WIP over time', wipOther: 'Other', wipEmpty: 'Flow snapshots accumulate daily with each sync.',
    throughput: 'Throughput & forecast', weeklyDone: 'Resolved per week', avgWeekly: 'Weekly average',
    weeksUnit: 'weeks', byDate: 'by', atPace: 'At current pace',
    fcOpen: 'Clear open', fcOverdue: 'Clear overdue', fcBreach: 'Clear SLA-breached', noForecast: 'Cannot forecast (not enough throughput)',
    sla: 'SLA forecast',
    thRemaining: 'Days left',
    noAtRisk: 'No tickets at risk 🎉',
    cycleByPriority: 'Cycle time by priority (days)',
    stageResidence: 'Time spent in each stage (days)',
    noStages: 'Not enough stage data yet.',
    dayUnit: ' d',
    loading: '… Loading',
    loadError: 'Failed to load: ',
    exc: { overdue: 'Overdue', stagnant: 'Stagnant', review: 'Review', unassigned: 'Unassigned' },
    slaState: { breached: 'Breached', at_risk: 'At risk', on_track: 'On track' },
  },
};

const LangCtx = createContext(null);
const useUI = () => useContext(LangCtx);

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'server error');
  return body.data;
}

// كشف الشاشات الصغيرة (الجوال) لعرض بطاقات بدل الجداول
function useIsMobile(bp = 700) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [bp]);
  return m;
}

// ------------------------------------------------------------------- shell
export default function JiraExceptionMonitor() {
  const [lang, setLang] = useState('ar');
  const [theme, setTheme] = useState('light');
  const [tab, setTab] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [meta, setMeta] = useState(null);
  const [me, setMe] = useState(null);
  const { logo, appBackground, appName, appSubtitle, appNameEn, appSubtitleEn, appBgDim, appBgShow, pageSize } = useBranding();
  const isMobile = useIsMobile();

  // المستخدم الحالي وصلاحياته + لغته المحفوظة على حسابه
  useEffect(() => {
    fetchJson('/api/auth/me').then((d) => {
      setMe(d.user);
      if (d.user?.lang === 'ar' || d.user?.lang === 'en') setLang(d.user.lang);
      if (d.user?.theme === 'light' || d.user?.theme === 'dark') setTheme(d.user.theme);
    }).catch(() => {});
  }, []);

  // تغيير اللغة: فوري + حفظ على حساب المستخدم
  const changeLang = (l) => {
    setLang(l);
    fetch('/api/auth/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang: l }) }).catch(() => {});
  };
  // تغيير الثيم: فوري + حفظ على حساب المستخدم
  const changeTheme = (th) => {
    setTheme(th);
    fetch('/api/auth/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: th }) }).catch(() => {});
  };

  // استعادة التفضيلات المحفوظة محلياً
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedLang = localStorage.getItem('lang');
    if (savedLang === 'ar' || savedLang === 'en') setLang(savedLang);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
  }, []);

  useEffect(() => {
    const t = DICT[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    localStorage.setItem('lang', lang);
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // بيانات تعريفية (رابط جيرا + آخر مزامنة) — تُحدَّث مع كل تحديث
  useEffect(() => {
    fetchJson('/api/meta').then(setMeta).catch(() => {});
  }, [reloadKey]);

  const t = DICT[lang];
  const fmt = (n) => (n == null ? '—' : new Intl.NumberFormat('en-US').format(n));
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString(t.locale, { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—';
  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString(t.locale, {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        })
      : t.never;
  const refresh = () => setReloadKey((k) => k + 1);

  const perms = me?.permissions || [];
  const can = (k) => perms.includes(k);
  const hasAdmin = can('manage_users') || can('manage_roles') || can('manage_settings') || can('reset_2fa');
  const tabs = [
    can('view_operational') && 'operational',
    can('view_managerial') && 'managerial',
    'account', // الإدارة/الحساب (يشمل 2FA للجميع)
  ].filter(Boolean);

  // اختر أول تبويب متاح بمجرد معرفة الصلاحيات
  useEffect(() => {
    if (me && !tab) setTab(tabs[0]);
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const tabLabel = (k) =>
    k === 'operational' ? t.tabOperational : k === 'managerial' ? t.tabManagerial : hasAdmin ? t.tabAdmin : t.account;

  return (
    <LangCtx.Provider value={{ lang, t, fmt, fmtDate, fmtDateTime, jiraBaseUrl: meta?.jiraBaseUrl || null, perms, pageSize }}>
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, ...backgroundStyle(appBgShow ? appBackground : null, appBgDim) }}>
        <header
          style={{
            background: C.card,
            borderBottom: `1px solid ${C.border}`,
            padding: isMobile ? '12px 14px' : '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} />
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: 20 }}>
                {(lang === 'en' ? (appNameEn || appName) : (appName || appNameEn)) || t.title}
              </h1>
              <p style={{ margin: '2px 0 0', color: C.muted, fontSize: 13 }}>
                {(lang === 'en' ? (appSubtitleEn || appSubtitle) : (appSubtitle || appSubtitleEn)) || t.subtitle} · {t.lastSync}: {fmtDateTime(meta?.lastSyncAt)}
              </p>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {tabs.map((k) => (
              <TabButton key={k} active={tab === k} onClick={() => setTab(k)}>
                {tabLabel(k)}
              </TabButton>
            ))}
            <button onClick={refresh} title={t.refresh} style={ghostBtn}>↻ {t.refresh}</button>
            <button onClick={() => changeTheme(theme === 'dark' ? 'light' : 'dark')} title="theme" style={ghostBtn}>
              {theme === 'dark' ? '☀︎' : '☾'}
            </button>
            <button onClick={() => changeLang(lang === 'ar' ? 'en' : 'ar')} title={t.other} style={ghostBtn}>
              {t.other}
            </button>
            {me && (
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13, color: C.muted }}>
                <span>· {me.username}</span>
                <button onClick={logout} style={ghostBtn}>{t.logout}</button>
              </span>
            )}
          </nav>
        </header>

        <main style={{ padding: isMobile ? 12 : 24, maxWidth: 1200, margin: '0 auto' }}>
          {tab === 'operational' && <OperationalTab key={`op-${reloadKey}`} />}
          {tab === 'managerial' && <ManagerialTab key={`mg-${reloadKey}`} />}
          {tab === 'account' && <AdminPanel lang={lang} perms={perms} />}
          {!tab && <Loading />}
        </main>
      </div>
    </LangCtx.Provider>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 18px',
        border: `1px solid ${active ? C.green : C.border}`,
        background: active ? C.green : C.card,
        color: active ? '#fff' : C.text,
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------------- shared UI
function Card({ title, children, extra }) {
  return (
    <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

function StatCard({ label, value, color }) {
  const { fmt } = useUI();
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderTop: `3px solid ${color || C.green}`,
        borderRadius: 8,
        padding: '14px 16px',
        flex: '1 1 140px',
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, color: color || C.text }}>{fmt(value)}</div>
      <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Chip({ color, children }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: `${color}15`,
        color,
        border: `1px solid ${color}40`,
        borderRadius: 12,
        padding: '2px 9px',
        fontSize: 12,
        margin: '0 2px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function Th({ children, align }) {
  const { t } = useUI();
  return (
    <th style={{ textAlign: align || (t.dir === 'rtl' ? 'right' : 'left'), padding: '8px 10px', borderBottom: `2px solid ${C.border}`, color: C.muted, fontSize: 13, fontWeight: 600 }}>
      {children}
    </th>
  );
}

function Td({ children, align }) {
  const { t } = useUI();
  return (
    <td style={{ textAlign: align || (t.dir === 'rtl' ? 'right' : 'left'), padding: '8px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      {children}
    </td>
  );
}

// مفتاح التذكرة كرابط يفتح التذكرة في جيرا (إن توفّر الرابط الأساسي)
function KeyLink({ k }) {
  const { jiraBaseUrl } = useUI();
  if (!jiraBaseUrl) return <strong>{k}</strong>;
  return (
    <a
      href={`${jiraBaseUrl}/browse/${k}`}
      target="_blank"
      rel="noreferrer"
      style={{ color: C.blue, textDecoration: 'none', fontWeight: 700 }}
    >
      {k}
    </a>
  );
}

function Loading() {
  const { t } = useUI();
  return <div style={{ color: C.muted, padding: 20, textAlign: 'center' }}>{t.loading}</div>;
}
function ErrorBox({ message }) {
  const { t } = useUI();
  return (
    <div style={{ color: C.red, padding: 14, background: `${C.red}10`, borderRadius: 6, fontSize: 13 }}>
      {t.loadError}{message}
    </div>
  );
}

function BarRow({ label, value, max, color, suffix }) {
  const { fmt } = useUI();
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{ width: 160, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ flex: 1, background: C.bg, borderRadius: 4, height: 18 }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4 }} />
      </div>
      <div style={{ width: 80, fontSize: 13, color: C.muted }}>
        {fmt(value)}{suffix || ''}
      </div>
    </div>
  );
}

// قيمة خاصة تمثّل "بدون مسؤول" في فلتر المسؤول
const UNASSIGNED = ' unassigned';

// قائمة تصنيف متعددة الاختيار (checkboxes داخل منسدلة)
function MultiSelect({ label, value, options, onChange, labels = {} }) {
  const { t } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const labelFor = (o) => labels[o] || o;
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  const summary = value.length === 0 ? t.all : value.length === 1 ? labelFor(value[0]) : `${value.length}`;

  return (
    <div ref={ref} style={{ position: 'relative', fontSize: 13 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ ...inputStyle, cursor: 'pointer', display: 'inline-flex', gap: 6, alignItems: 'center', maxWidth: 220 }}
      >
        <span style={{ color: C.muted }}>{label}:</span>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</strong>
        <span style={{ color: C.muted }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', zIndex: 30, top: '100%', insetInlineStart: 0, marginTop: 4,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            boxShadow: '0 4px 14px rgba(0,0,0,.08)', padding: 6, minWidth: 190, maxHeight: 280, overflowY: 'auto',
          }}
        >
          {value.length > 0 && (
            <button onClick={() => onChange([])} style={{ ...ghostBtn, width: '100%', marginBottom: 4 }}>{t.clear}</button>
          )}
          {options.length === 0 && <div style={{ color: C.muted, padding: 6 }}>—</div>}
          {options.map((o) => (
            <label key={o} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={value.includes(o)} onChange={() => toggle(o)} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: o === UNASSIGNED ? C.purple : undefined }}>{labelFor(o)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// تصدير صفوف إلى CSV وتنزيلها (مع BOM لدعم العربية في Excel)
function downloadCsv(rows, t) {
  const headers = [t.thKey, t.thSummary, t.fProject, t.thStatus, t.thPriority, t.thAssignee, t.thDue, t.thDays, t.thReasons];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) {
    lines.push([
      r.key, r.summary, r.project, r.status, r.priority, r.assignee || '',
      r.dueDate || '', r.daysInStatus, r.reasonsAr ? r.reasonsAr.join(' | ') : r.reasons.join(' | '),
    ].map(esc).join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exceptions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json();
  if (!j.ok) throw new Error(j.error || 'error');
  return j.data;
}

// نافذة إجراءات على تذكرة: تعليق · إسناد · نقل الحالة (Write-back لجيرا)
function TicketActions({ ticket, onClose, onDone }) {
  const { t, perms } = useUI();
  const canAct = (perms || []).includes('act_tickets');
  const canManage = (perms || []).includes('manage_exceptions');
  // حالة المتابعة
  const [fu, setFu] = useState({ acknowledged: false, note: '', snoozeUntil: '', ownerUserId: '', rootCause: '' });
  const [userOpts, setUserOpts] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [transitions, setTransitions] = useState([]);
  const [transitionId, setTransitionId] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [editFields, setEditFields] = useState([]);
  const [editValues, setEditValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState(null);

  const actTabs = [
    canManage && 'followup',
    canAct && 'comment',
    canAct && 'assign',
    canAct && 'fields',
    canAct && 'transition',
  ].filter(Boolean);
  const tabLabel = { followup: t.followup, comment: t.comment, assign: t.assign, fields: t.editFields, transition: t.transition };

  useEffect(() => {
    if (!ticket) return;
    setTab((prev) => prev || (canManage ? 'followup' : canAct ? 'comment' : null));
    if (canManage) {
      const f = ticket.followup || {};
      setFu({
        acknowledged: !!f.acknowledged,
        note: f.note || '',
        snoozeUntil: f.snoozeUntil ? String(f.snoozeUntil).slice(0, 10) : '',
        ownerUserId: f.ownerId || '',
        rootCause: f.rootCause || '',
      });
      fetchJson('/api/users/options').then((d) => setUserOpts(d.users)).catch(() => {});
    }
    if (canAct) {
      fetchJson(`/api/tickets/${ticket.key}/assign`).then((d) => setAssignees(d.assignees)).catch(() => {});
      fetchJson(`/api/tickets/${ticket.key}/transition`).then((d) => setTransitions(d.transitions)).catch(() => {});
      fetchJson(`/api/tickets/${ticket.key}/fields`).then((d) => setEditFields(d.fields)).catch(() => {});
    }
  }, [ticket, canAct, canManage]);

  // بناء حمولة الحقول بصيغة جيرا
  const buildEditPayload = () => {
    const out = {};
    for (const f of editFields) {
      const v = editValues[f.id];
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
      if (f.type === 'array') {
        out[f.id] = f.allowedValues.length > 0
          ? (Array.isArray(v) ? v : [v]).map((id) => ({ id }))
          : String(v).split(',').map((s) => s.trim()).filter(Boolean);
      } else if (f.allowedValues.length > 0) {
        out[f.id] = { id: v };
      } else {
        out[f.id] = v;
      }
    }
    return out;
  };

  if (!ticket) return null;

  async function run(fn) {
    setBusy(true); setErr(''); setMsg('');
    try { await fn(); setMsg(t.actDone); onDone?.(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 10, padding: 20, width: 340, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 6px 24px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{ticket.key}</h3>
          <button onClick={onClose} style={ghostBtn}>{t.close}</button>
        </div>

        {/* تبويبات الإجراءات */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 10 }}>
          {actTabs.map((k) => (
            <button key={k} onClick={() => { setTab(k); setMsg(''); setErr(''); }}
              style={{ ...ghostBtn, ...(tab === k ? { background: C.green, color: '#fff', border: 0 } : {}) }}>
              {tabLabel[k]}
            </button>
          ))}
        </div>

        {/* المتابعة الإدارية */}
        {tab === 'followup' && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0', fontSize: 14 }}>
              <input type="checkbox" checked={fu.acknowledged} onChange={(e) => setFu({ ...fu, acknowledged: e.target.checked })} />
              {t.acknowledge}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <label style={{ fontSize: 12, color: C.muted }}>
                {t.snoozeUntil}
                <input type="date" value={fu.snoozeUntil} onChange={(e) => setFu({ ...fu, snoozeUntil: e.target.value })} style={{ ...inputStyle, display: 'block', marginTop: 2 }} />
              </label>
              <label style={{ fontSize: 12, color: C.muted }}>
                {t.owner}
                <select value={fu.ownerUserId} onChange={(e) => setFu({ ...fu, ownerUserId: e.target.value })} style={{ ...inputStyle, display: 'block', marginTop: 2, cursor: 'pointer' }}>
                  <option value="">{t.pick}</option>
                  {userOpts.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 12, color: C.muted }}>
                {t.rootCause}
                <select value={fu.rootCause} onChange={(e) => setFu({ ...fu, rootCause: e.target.value })} style={{ ...inputStyle, display: 'block', marginTop: 2, cursor: 'pointer' }}>
                  <option value="">{t.pick}</option>
                  {Object.keys(t.rc).map((k) => <option key={k} value={k}>{t.rc[k]}</option>)}
                </select>
              </label>
            </div>
            <input value={fu.note} onChange={(e) => setFu({ ...fu, note: e.target.value })} placeholder={t.noteL} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 6 }} />
            <button disabled={busy} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/followup`, { acknowledged: fu.acknowledged, note: fu.note, snoozeUntil: fu.snoozeUntil || null, ownerUserId: fu.ownerUserId || null, rootCause: fu.rootCause || null }))} style={{ background: C.green, color: '#fff', border: 0, borderRadius: 5, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>{t.saveFollowup}</button>
          </div>
        )}

        {/* تعليق */}
        {tab === 'comment' && (<>
        <label style={{ fontSize: 13, color: C.muted }}>{t.comment}</label>
        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', ...inputStyle, marginBottom: 6 }} />
        <button disabled={busy || !commentText.trim()} onClick={() => run(async () => { await postJson(`/api/tickets/${ticket.key}/comment`, { body: commentText }); setCommentText(''); })} style={ghostBtn}>{t.send}</button>
        </>)}

        {/* إسناد */}
        {tab === 'assign' && (<>
        <label style={{ fontSize: 13, color: C.muted, display: 'block' }}>{t.assign}</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
            <option value="">{t.pick}</option>
            <option value="__unassign__">— {t.unassign} —</option>
            {assignees.map((a) => <option key={a.accountId} value={a.accountId}>{a.name}</option>)}
          </select>
          <button disabled={busy || !accountId} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/assign`, { accountId: accountId === '__unassign__' ? null : accountId }))} style={ghostBtn}>{t.apply}</button>
        </div>
        </>)}

        {/* تعديل الحقول (لتلبية شروط الانتقالات مثل labels) */}
        {tab === 'fields' && (
          <div>
            {editFields.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
            {editFields.map((f) => (
              <div key={f.id} style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: C.muted }}>{f.name}{f.required ? ' *' : ''}</label>
                {f.type === 'array' && f.allowedValues.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {f.allowedValues.map((v) => {
                      const arr = editValues[f.id] || [];
                      const on = arr.includes(v.id);
                      return (
                        <button key={v.id} onClick={() => setEditValues({ ...editValues, [f.id]: on ? arr.filter((x) => x !== v.id) : [...arr, v.id] })} style={on ? { ...ghostBtn, background: C.blue, color: '#fff', border: 0 } : ghostBtn}>{v.label}</button>
                      );
                    })}
                  </div>
                ) : f.allowedValues.length > 0 ? (
                  <select value={editValues[f.id] || ''} onChange={(e) => setEditValues({ ...editValues, [f.id]: e.target.value })} style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                    <option value="">{t.pick}</option>
                    {f.allowedValues.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                ) : (
                  <input value={editValues[f.id] || ''} onChange={(e) => setEditValues({ ...editValues, [f.id]: e.target.value })} placeholder={f.type === 'array' ? t.commaSep : ''} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
            <button disabled={busy} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/fields`, { fields: buildEditPayload() }))} style={ghostBtn}>{t.apply}</button>
          </div>
        )}

        {/* نقل الحالة */}
        {tab === 'transition' && (<>
        <label style={{ fontSize: 13, color: C.muted, display: 'block' }}>{t.transition}</label>
        {(() => {
          const sel = transitions.find((tr) => tr.id === transitionId);
          const reqFields = sel?.fields || [];
          const missing = reqFields.some((f) => !fieldValues[f.id]);
          // قيمة جاهزة لجيرا: حقول القوائم ترسَل { id }، والنصية كنص
          const buildFields = () => {
            const out = {};
            for (const f of reqFields) {
              const v = fieldValues[f.id];
              if (!v) continue;
              out[f.id] = f.allowedValues.length > 0 ? { id: v } : v;
            }
            return out;
          };
          return (
            <>
              <div style={{ display: 'flex', gap: 6 }}>
                <select value={transitionId} onChange={(e) => { setTransitionId(e.target.value); setFieldValues({}); }} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
                  <option value="">{t.pick}</option>
                  {transitions.map((tr) => <option key={tr.id} value={tr.id}>{tr.name}{tr.to ? ` → ${tr.to}` : ''}</option>)}
                </select>
                <button disabled={busy || !transitionId || missing} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/transition`, { transitionId, fields: buildFields() }))} style={ghostBtn}>{t.apply}</button>
              </div>
              {reqFields.map((f) => (
                <div key={f.id} style={{ marginTop: 6 }}>
                  <label style={{ fontSize: 12, color: C.muted }}>{f.name} *</label>
                  {f.allowedValues.length > 0 ? (
                    <select value={fieldValues[f.id] || ''} onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })} style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}>
                      <option value="">{t.pick}</option>
                      {f.allowedValues.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                    </select>
                  ) : (
                    <input value={fieldValues[f.id] || ''} onChange={(e) => setFieldValues({ ...fieldValues, [f.id]: e.target.value })} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
            </>
          );
        })()}
        </>)}

        {msg && <div style={{ color: C.green, fontSize: 13, marginTop: 10 }}>{msg}</div>}
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>
    </div>
  );
}

// بطاقة استثناء للجوال (بديل صف الجدول)
function ExceptionCard({ it, canManage, canOpen, onAction }) {
  const { t, fmt, fmtDate } = useUI();
  const F = ({ label, children }) => (
    <div style={{ fontSize: 12 }}><span style={{ color: C.muted }}>{label}: </span>{children}</div>
  );
  const fu = it.followup || {};
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 10, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <KeyLink k={it.key} />
        {canOpen && <button onClick={() => onAction(it)} style={ghostBtn}>{t.act}</button>}
      </div>
      <div style={{ fontSize: 13, margin: '6px 0', fontWeight: 600 }}>{it.summary}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginBottom: 6 }}>
        <F label={t.fProject}>{it.project}</F>
        <F label={t.thStatus}>{it.status}</F>
        <F label={t.thPriority}>{it.priority}</F>
        <F label={t.thAssignee}>{it.assignee || <span style={{ color: C.red }}>—</span>}</F>
        <F label={t.thDue}>{fmtDate(it.dueDate)}</F>
        <F label={t.thDays}>{fmt(it.daysInStatus)}</F>
      </div>
      <div>{it.reasons.map((r) => <Chip key={r} color={EXC_COLORS[r]}>{t.exc[r] || r}</Chip>)}</div>
      {canManage && (fu.acknowledged || fu.snoozed || fu.ownerName || fu.rootCause) && (
        <div style={{ marginTop: 4 }}>
          {fu.acknowledged && <Chip color={C.green}>✓ {t.acked}</Chip>}
          {fu.snoozed && <Chip color="#8a96a3">{t.snoozed} {fmtDate(fu.snoozeUntil)}</Chip>}
          {fu.ownerName && <Chip color={C.blue}>{fu.ownerName}</Chip>}
          {fu.rootCause && <Chip color={C.amber}>{t.rc[fu.rootCause] || fu.rootCause}</Chip>}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------- العملياتي
function OperationalTab() {
  const { t, fmt, fmtDate, perms, pageSize } = useUI();
  const isMobile = useIsMobile();
  const canAct = (perms || []).includes('act_tickets');
  const canManage = (perms || []).includes('manage_exceptions');
  const canOpen = canAct || canManage;
  const [actionTicket, setActionTicket] = useState(null);
  const [hideSnoozed, setHideSnoozed] = useState(true);
  const [hideAcked, setHideAcked] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // تصنيف النتائج (متعدد الاختيار): مسؤول · مشروع · أولوية · حالة
  const [fAssignee, setFAssignee] = useState([]);
  const [fProject, setFProject] = useState([]);
  const [fPriority, setFPriority] = useState([]);
  const [fStatus, setFStatus] = useState([]);

  // ترقيم الصفحات (حجم الصفحة من إعدادات الإدارة)
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const [exc, wl] = await Promise.all([
        fetchJson(`/api/exceptions?${qs.toString()}`),
        fetchJson('/api/workload'),
      ]);
      setData(exc);
      setWorkload(wl.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const items = data?.items || [];
  const uniq = (sel) => Array.from(new Set(items.map(sel).filter(Boolean))).sort();
  const opts = useMemo(() => {
    const hasUnassigned = items.some((x) => !x.assignee);
    return {
      // نضيف خيار "بدون مسؤول" في مقدمة قائمة المسؤولين عند وجود تذاكر بلا مُسنَد
      assignees: [...(hasUnassigned ? [UNASSIGNED] : []), ...uniq((x) => x.assignee)],
      projects: uniq((x) => x.project),
      priorities: uniq((x) => x.priority),
      statuses: uniq((x) => x.status),
    };
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => items.filter((x) =>
    (fAssignee.length === 0
      || fAssignee.includes(x.assignee)
      || (fAssignee.includes(UNASSIGNED) && !x.assignee)) &&
    (fProject.length === 0 || fProject.includes(x.project)) &&
    (fPriority.length === 0 || fPriority.includes(x.priority)) &&
    (fStatus.length === 0 || fStatus.includes(x.status)) &&
    (!hideSnoozed || !x.followup?.snoozed) &&
    (!hideAcked || !x.followup?.acknowledged)
  ), [items, fAssignee, fProject, fPriority, fStatus, hideSnoozed, hideAcked]);

  // أعد للصفحة الأولى عند تغيّر الفلاتر أو حجم الصفحة
  useEffect(() => { setPage(1); }, [fAssignee, fProject, fPriority, fStatus, hideSnoozed, hideAcked, pageSize, items.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const counts = data?.counts || {};
  const maxLoad = Math.max(1, ...(workload || []).map((w) => w.openCount));
  const anyFilter = fAssignee.length || fProject.length || fPriority.length || fStatus.length;

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label={t.cOverdue} value={counts.overdue} color={C.red} />
        <StatCard label={t.cStagnant} value={counts.stagnant} color={C.amber} />
        <StatCard label={t.cReview} value={counts.review} color={C.blue} />
        <StatCard label={t.cUnassigned} value={counts.unassigned} color={C.purple} />
      </div>

      <Card
        title={`${t.exceptions} · ${t.showing(fmt(filtered.length), fmt(items.length))}`}
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: C.muted }}>{t.from}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
            <span style={{ color: C.muted }}>{t.to}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); }} style={ghostBtn}>{t.clear}</button>
            )}
          </div>
        }
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
          <MultiSelect label={t.fAssignee} value={fAssignee} options={opts.assignees} onChange={setFAssignee} labels={{ [UNASSIGNED]: t.cUnassigned }} />
          <MultiSelect label={t.fProject} value={fProject} options={opts.projects} onChange={setFProject} />
          <MultiSelect label={t.fPriority} value={fPriority} options={opts.priorities} onChange={setFPriority} />
          <MultiSelect label={t.fStatus} value={fStatus} options={opts.statuses} onChange={setFStatus} />
          {anyFilter ? (
            <button onClick={() => { setFAssignee([]); setFProject([]); setFPriority([]); setFStatus([]); }} style={ghostBtn}>{t.clear}</button>
          ) : null}
          {canManage && (
            <>
              <label style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 13, color: C.muted }}>
                <input type="checkbox" checked={hideSnoozed} onChange={(e) => setHideSnoozed(e.target.checked)} /> {t.hideSnoozed}
              </label>
              <label style={{ display: 'inline-flex', gap: 5, alignItems: 'center', fontSize: 13, color: C.muted }}>
                <input type="checkbox" checked={hideAcked} onChange={(e) => setHideAcked(e.target.checked)} /> {t.hideAcked}
              </label>
            </>
          )}
          <button onClick={() => downloadCsv(filtered, t)} style={{ ...ghostBtn, marginInlineStart: 'auto' }}>⬇ {t.exportCsv}</button>
        </div>
        {isMobile ? (
          <div>
            {pageItems.map((it) => (
              <ExceptionCard key={it.id} it={it} canManage={canManage} canOpen={canOpen} onAction={setActionTicket} />
            ))}
            {filtered.length === 0 && <div style={{ textAlign: 'center', color: C.muted, padding: 16 }}>{t.noExceptions}</div>}
          </div>
        ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>{t.thKey}</Th>
                <Th>{t.thSummary}</Th>
                <Th>{t.fProject}</Th>
                <Th>{t.thStatus}</Th>
                <Th>{t.thPriority}</Th>
                <Th>{t.thAssignee}</Th>
                <Th>{t.thDue}</Th>
                <Th align="center">{t.thDays}</Th>
                <Th>{t.thReasons}</Th>
                {canManage && <Th>{t.followup}</Th>}
                {canOpen && <Th align="center">{t.actions}</Th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((it) => (
                <tr key={it.id}>
                  <Td><KeyLink k={it.key} /></Td>
                  <Td>{it.summary}</Td>
                  <Td>{it.project}</Td>
                  <Td>{it.status}</Td>
                  <Td>{it.priority}</Td>
                  <Td>{it.assignee || <span style={{ color: C.red }}>—</span>}</Td>
                  <Td>{fmtDate(it.dueDate)}</Td>
                  <Td align="center">{fmt(it.daysInStatus)}</Td>
                  <Td>
                    {it.reasons.map((r) => (
                      <Chip key={r} color={EXC_COLORS[r]}>{t.exc[r] || r}</Chip>
                    ))}
                  </Td>
                  {canManage && (
                    <Td>
                      {it.followup?.acknowledged && <Chip color={C.green}>✓ {t.acked}</Chip>}
                      {it.followup?.snoozed && <Chip color="#8a96a3">{t.snoozed} {fmtDate(it.followup.snoozeUntil)}</Chip>}
                      {it.followup?.ownerName && <Chip color={C.blue}>{it.followup.ownerName}</Chip>}
                      {it.followup?.rootCause && <Chip color={C.amber}>{t.rc[it.followup.rootCause] || it.followup.rootCause}</Chip>}
                    </Td>
                  )}
                  {canOpen && (
                    <Td align="center">
                      <button onClick={() => setActionTicket(it)} style={ghostBtn} title={t.actions}>{t.act}</button>
                    </Td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><Td align="center">{t.noExceptions}</Td></tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* ترقيم الصفحات */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} style={ghostBtn}>‹ {t.prev}</button>
            <span style={{ fontSize: 13, color: C.muted }}>{t.pageOf(safePage, totalPages)}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={ghostBtn}>{t.next} ›</button>
          </div>
        )}
      </Card>

      {actionTicket && (
        <TicketActions ticket={actionTicket} onClose={() => setActionTicket(null)} onDone={load} />
      )}

      <Card title={t.workload}>
        {(workload || []).map((w) => (
          <BarRow
            key={w.accountId || w.assignee}
            label={w.assignee}
            value={w.openCount}
            max={maxLoad}
            color={w.overdue > 0 ? C.amber : C.green}
            suffix={w.overdue > 0 ? t.overdueSuffix(fmt(w.overdue)) : ''}
          />
        ))}
      </Card>
    </>
  );
}

// ------------------------------------------------------------------- الإداري
function ManagerialTab() {
  const { t, pageSize } = useUI();
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [sla, setSla] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [flow, setFlow] = useState(null);
  const [throughput, setThroughput] = useState(null);
  const [wip, setWip] = useState(null);
  const [perf, setPerf] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [slaPage, setSlaPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const [s, tr, sl, c, sc, fl, tp, wp, pf] = await Promise.all([
          fetchJson('/api/analytics/summary'),
          fetchJson('/api/analytics/trend?days=30'),
          fetchJson('/api/analytics/sla-forecast'),
          fetchJson('/api/analytics/cycle-time?days=90'),
          fetchJson('/api/analytics/scorecard'),
          fetchJson('/api/analytics/flow'),
          fetchJson('/api/analytics/throughput?weeks=12'),
          fetchJson('/api/analytics/wip?days=30'),
          fetchJson('/api/analytics/performance?days=90'),
        ]);
        setSummary(s);
        setTrend(tr.series);
        setSla(sl);
        setCycle(c);
        setScorecard(sc.items);
        setFlow(fl);
        setThroughput(tp);
        setWip(wp);
        setPerf(pf);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const maxCycle = Math.max(1, ...(cycle?.cycle?.byPriority || []).map((p) => p.avgDays || 0));
  const maxStage = Math.max(1, ...(cycle?.stages || []).map((s) => s.avgDays || 0));
  const atRisk = (sla?.items || []).filter((x) => x.slaStatus !== 'on_track');
  const slaTotalPages = Math.max(1, Math.ceil(atRisk.length / pageSize));
  const slaSafePage = Math.min(slaPage, slaTotalPages);
  const atRiskPage = atRisk.slice((slaSafePage - 1) * pageSize, slaSafePage * pageSize);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label={t.sTotal} value={summary.totalTickets} color={C.blue} />
        <StatCard label={t.sOpen} value={summary.openTickets} color={C.amber} />
        <StatCard label={t.sDone} value={summary.doneTickets} color={C.green} />
        <StatCard label={t.sBreached} value={summary.slaBreached} color={C.red} />
        <StatCard label={t.sAvgCycle} value={summary.avgCycleDays} color={C.purple} />
      </div>

      <Card title={`${t.performance} · ${perf ? t.windowD(perf.windowDays) : ''}`}>
        <Performance data={perf} />
      </Card>

      <Card title={t.scorecard}>
        <Scorecard items={scorecard} />
      </Card>

      <Card title={t.flow}>
        <Flow flow={flow} />
      </Card>

      <Card title={t.wipOverTime}>
        <WipChart data={wip} />
      </Card>

      <Card title={t.throughput}>
        <Throughput data={throughput} />
      </Card>

      <Card title={t.trend}>
        <TrendChart series={trend} />
      </Card>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px' }}>
          <Card title={t.sla}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <StatCard label={t.slaState.breached} value={sla.summary.breached} color={C.red} />
              <StatCard label={t.slaState.at_risk} value={sla.summary.at_risk} color={C.amber} />
              <StatCard label={t.slaState.on_track} value={sla.summary.on_track} color={C.green} />
            </div>
            {isMobile ? (
              <div>
                {atRiskPage.map((x) => (
                  <div key={x.key} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <KeyLink k={x.key} />
                      <Chip color={SLA_COLORS[x.slaStatus]}>{t.slaState[x.slaStatus]}</Chip>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                      {x.priority} · {t.thRemaining}: <DaysCell value={x.daysRemaining} />
                    </div>
                  </div>
                ))}
                {atRisk.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>{t.noAtRisk}</div>}
              </div>
            ) : (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
              <thead>
                <tr>
                  <Th>{t.thKey}</Th>
                  <Th>{t.thPriority}</Th>
                  <Th align="center">{t.thRemaining}</Th>
                  <Th>{t.thStatus}</Th>
                </tr>
              </thead>
              <tbody>
                {atRiskPage.map((x) => (
                  <tr key={x.key}>
                    <Td><KeyLink k={x.key} /></Td>
                    <Td>{x.priority}</Td>
                    <Td align="center"><DaysCell value={x.daysRemaining} /></Td>
                    <Td><Chip color={SLA_COLORS[x.slaStatus]}>{t.slaState[x.slaStatus]}</Chip></Td>
                  </tr>
                ))}
                {atRisk.length === 0 && <tr><Td align="center">{t.noAtRisk}</Td></tr>}
              </tbody>
            </table>
            </div>
            )}
            {atRisk.length > 0 && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
                <button onClick={() => setSlaPage((p) => Math.max(1, p - 1))} disabled={slaSafePage <= 1} style={ghostBtn}>‹ {t.prev}</button>
                <span style={{ fontSize: 13, color: C.muted }}>{t.pageOf(slaSafePage, slaTotalPages)}</span>
                <button onClick={() => setSlaPage((p) => Math.min(slaTotalPages, p + 1))} disabled={slaSafePage >= slaTotalPages} style={ghostBtn}>{t.next} ›</button>
              </div>
            )}
          </Card>
        </div>

        <div style={{ flex: '1 1 340px' }}>
          <Card title={t.cycleByPriority}>
            {(cycle?.cycle?.byPriority || []).map((p) => (
              <BarRow key={p.priority} label={p.priority} value={p.avgDays || 0} max={maxCycle} color={C.purple} suffix={t.dayUnit} />
            ))}
          </Card>

          <Card title={t.stageResidence}>
            {(cycle?.stages || []).slice(0, 8).map((s) => (
              <BarRow key={s.stage} label={s.stage} value={s.avgDays || 0} max={maxStage} color={C.blue} suffix={t.dayUnit} />
            ))}
            {(!cycle?.stages || cycle.stages.length === 0) && (
              <div style={{ color: C.muted, fontSize: 13 }}>{t.noStages}</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function DaysCell({ value }) {
  const { fmt } = useUI();
  return <span style={{ color: value < 0 ? C.red : C.text }}>{fmt(value)}</span>;
}

// تقييم الأداء: مسؤولون + مشاريع، مع مؤشّر عام
function scoreColor(s) { return s >= 75 ? C.green : s >= 50 ? C.amber : C.red; }
function ScorePill({ value }) {
  return <span style={{ fontWeight: 700, color: scoreColor(value) }}>{value}</span>;
}
function Performance({ data }) {
  const { t, fmt } = useUI();
  const isMobile = useIsMobile();
  if (!data) return <Loading />;

  const F = ({ label, children }) => (<div style={{ fontSize: 12 }}><span style={{ color: C.muted }}>{label}: </span>{children}</div>);

  const assigneeCard = (x) => (
    <div key={x.name} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{x.name}</strong><ScorePill value={x.overall} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', marginTop: 4 }}>
        <F label={t.colResolved}>{fmt(x.resolved)}</F>
        <F label={t.onTime}>{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</F>
        <F label={t.colCycle}>{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)}${t.dayUnit}`}</F>
        <F label={t.colLoad}>{fmt(x.openLoad)}{x.stuck ? ` · ${fmt(x.stuck)} ${t.stuckLabel}` : ''}</F>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>{t.perfNote}</div>

      <div style={{ fontSize: 13, fontWeight: 600, margin: '4px 0 6px' }}>{t.perfAssignees}</div>
      {isMobile ? (
        (data.assignees || []).map(assigneeCard)
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead><tr>
              <Th>{t.thAssignee}</Th><Th align="center">{t.score}</Th><Th align="center">{t.colResolved}</Th>
              <Th align="center">{t.onTime}</Th><Th align="center">{t.colCycle}</Th><Th align="center">{t.colLoad}</Th>
            </tr></thead>
            <tbody>
              {(data.assignees || []).map((x) => (
                <tr key={x.name}>
                  <Td>{x.name}</Td>
                  <Td align="center"><ScorePill value={x.overall} /></Td>
                  <Td align="center">{fmt(x.resolved)}</Td>
                  <Td align="center">{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</Td>
                  <Td align="center">{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)} ${t.dayUnit}`}</Td>
                  <Td align="center">{fmt(x.openLoad)}{x.stuck ? ` · ${fmt(x.stuck)}⚠` : ''}</Td>
                </tr>
              ))}
              {(!data.assignees || data.assignees.length === 0) && <tr><Td align="center">—</Td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 600, margin: '14px 0 6px' }}>{t.perfTeams}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead><tr>
            <Th>{t.fProject}</Th><Th align="center">{t.score}</Th><Th align="center">{t.colResolved}</Th>
            <Th align="center">{t.onTime}</Th><Th align="center">{t.colCycle}</Th><Th align="center">{t.colPredict}</Th>
          </tr></thead>
          <tbody>
            {(data.teams || []).map((x) => (
              <tr key={x.project}>
                <Td><strong>{x.project}</strong></Td>
                <Td align="center"><ScorePill value={x.overall} /></Td>
                <Td align="center">{fmt(x.resolved)}</Td>
                <Td align="center">{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</Td>
                <Td align="center">{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)} ${t.dayUnit}`}</Td>
                <Td align="center"><ScorePill value={x.scores.predictability} /></Td>
              </tr>
            ))}
            {(!data.teams || data.teams.length === 0) && <tr><Td align="center">—</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// بطاقة صحة المشاريع (RAG)
function Scorecard({ items }) {
  const { t, fmt } = useUI();
  const isMobile = useIsMobile();
  const HC = { red: C.red, amber: C.amber, green: C.green };
  if (!items) return <Loading />;
  if (items.length === 0) return <div style={{ color: C.muted, fontSize: 13 }}>—</div>;

  const healthBadge = (x) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: HC[x.health], display: 'inline-block' }} />
      {t.healthLabel[x.health]}
    </span>
  );

  if (isMobile) {
    const F = ({ label, children }) => (<div style={{ fontSize: 12 }}><span style={{ color: C.muted }}>{label}: </span>{children}</div>);
    return (
      <div>
        {items.map((x) => (
          <div key={x.project} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <strong>{x.project}</strong>
              {healthBadge(x)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px' }}>
              <F label={t.colOpen}>{fmt(x.openCount)}</F>
              <F label={t.colExc}>{fmt(x.exceptions)}</F>
              <F label={t.colBreach}><span style={{ color: x.breached > 0 ? C.red : C.text }}>{fmt(x.breached)}</span></F>
              <F label={t.onTime}>{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</F>
              <F label={t.colCycle}>{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)}${t.dayUnit}`}</F>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr>
            <Th>{t.fProject}</Th>
            <Th>{t.health}</Th>
            <Th align="center">{t.colOpen}</Th>
            <Th align="center">{t.colExc}</Th>
            <Th align="center">{t.colBreach}</Th>
            <Th align="center">{t.onTime}</Th>
            <Th align="center">{t.colCycle}</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x.project}>
              <Td><strong>{x.project}</strong></Td>
              <Td>{healthBadge(x)}</Td>
              <Td align="center">{fmt(x.openCount)}</Td>
              <Td align="center">{fmt(x.exceptions)}</Td>
              <Td align="center"><span style={{ color: x.breached > 0 ? C.red : C.text }}>{fmt(x.breached)}</span></Td>
              <Td align="center">{x.onTimeRate == null ? '—' : `${x.onTimeRate}%`}</Td>
              <Td align="center">{x.avgCycleDays == null ? '—' : `${fmt(x.avgCycleDays)} ${t.dayUnit}`}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// تدفّق العمل عبر الزمن: مساحات متراكمة لأعداد كل حالة (CFD مبسّط)
const WIP_PALETTE = ['#2490ef', '#1f7a4d', '#cb8a14', '#7c4dff', '#e0568b', '#14b8a6', '#8a96a3'];
function WipChart({ data }) {
  const { t, fmt } = useUI();
  if (!data) return <Loading />;
  const { series = [], statuses = [] } = data;
  if (series.length === 0 || statuses.length === 0) {
    return <div style={{ color: C.muted, fontSize: 13 }}>{t.wipEmpty}</div>;
  }
  const colorOf = (s, i) => (s === 'other' ? '#8a96a3' : WIP_PALETTE[i % WIP_PALETTE.length]);
  const labelOf = (s) => (s === 'other' ? t.wipOther : s);

  const W = 1000, H = 240, padL = 38, padB = 26, padT = 12;
  const n = series.length;
  const totals = series.map((d) => statuses.reduce((a, s) => a + (d[s] || 0), 0));
  const maxTotal = Math.max(1, ...totals);
  const x = (i) => padL + (n === 1 ? (W - padL - 10) / 2 : (i * (W - padL - 10)) / (n - 1));
  const y = (v) => padT + (1 - v / maxTotal) * (H - padT - padB);
  const ticks = 4;
  const grid = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxTotal / ticks) * i));

  // قيم متراكمة لكل يوم
  const stacks = series.map((d) => {
    let base = 0;
    return statuses.map((s) => { const v = d[s] || 0; const seg = { s, base, top: base + v }; base += v; return seg; });
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      {series.length < 2 && <div style={{ color: C.amber, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>{t.trendCollecting(series.length)}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 600, height: H }}>
        {grid.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={y(g)} x2={W - 10} y2={y(g)} style={{ stroke: C.border }} strokeDasharray="3 3" opacity="0.6" />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize="10" style={{ fill: C.muted }}>{fmt(g)}</text>
          </g>
        ))}
        {statuses.map((s, si) => {
          const tops = stacks.map((segs) => segs[si]);
          const pts = [
            ...tops.map((p, i) => `${x(i)},${y(p.top)}`),
            ...tops.map((p, i) => `${x(i)},${y(p.base)}`).reverse(),
          ].join(' ');
          return <polygon key={s} points={pts} fill={colorOf(s, si)} opacity="0.82" />;
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {statuses.map((s, si) => (
          <span key={s} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 10, background: colorOf(s, si), display: 'inline-block', borderRadius: 2 }} />
            {labelOf(s)}
          </span>
        ))}
      </div>
    </div>
  );
}

// الإنتاجية والتنبؤ: أعمدة المنجَز أسبوعياً + تقديرات استنزاف المتراكم
function Throughput({ data }) {
  const { t, fmt, fmtDate } = useUI();
  if (!data) return <Loading />;
  const maxW = Math.max(1, ...(data.series || []).map((w) => w.count));
  const fcLine = (label, count, f, color) => (
    <div style={{ fontSize: 13, padding: '3px 0' }}>
      <span style={{ color: C.muted }}>{label} ({fmt(count)}): </span>
      {f.weeks == null
        ? <span style={{ color: C.muted }}>{t.noForecast}</span>
        : <span style={{ color }}>{t.atPace} · {fmt(f.weeks)} {t.weeksUnit} · {t.byDate} {fmtDate(f.date)}</span>}
    </div>
  );
  return (
    <div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>
        {t.weeklyDone} · {t.avgWeekly}: <strong style={{ color: C.text }}>{fmt(data.avgWeekly)}</strong>
      </div>
      {(data.series || []).map((w) => (
        <BarRow key={w.week} label={fmtDate(w.week)} value={w.count} max={maxW} color={C.green} />
      ))}
      {(!data.series || data.series.length === 0) && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}

      <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
        {fcLine(t.fcOpen, data.backlog.open, data.forecast.open, C.amber)}
        {fcLine(t.fcOverdue, data.backlog.overdue, data.forecast.overdue, C.red)}
        {fcLine(t.fcBreach, data.backlog.breached, data.forecast.breached, C.red)}
      </div>
    </div>
  );
}

// تدفّق العمل: WIP حسب المرحلة (أعمدة) + جدول أقدم العالقين
function Flow({ flow }) {
  const { t, fmt, fmtDate } = useUI();
  const isMobile = useIsMobile();
  if (!flow) return <Loading />;
  const ageColor = (d) => (d > 14 ? C.red : d > 7 ? C.amber : C.green);
  const maxWip = Math.max(1, ...(flow.wip || []).map((w) => w.count));
  const aging = (flow.aging || []).slice(0, 20);
  const bn = flow.bottleneck;
  return (
    <div>
      {bn && (
        <div style={{ background: `${C.red}12`, border: `1px solid ${C.red}44`, borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>
          <strong style={{ color: C.red }}>⛔ {t.bottleneck}:</strong> {bn.stage}
          <span style={{ color: C.muted }}> — {fmt(bn.count)} {t.items}
            {bn.avgAge != null ? ` · ${t.avgAgeLabel} ${fmt(bn.avgAge)}${t.dayUnit}` : ''}
            {bn.maxAge != null ? ` · ${t.maxAgeLabel} ${fmt(bn.maxAge)}${t.dayUnit}` : ''}
            {bn.stuck ? ` · ${fmt(bn.stuck)} ${t.stuckLabel}` : ''}
          </span>
        </div>
      )}
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{t.wipByStage}</div>
      {(flow.wip || []).map((w) => (
        <BarRow
          key={w.stage}
          label={bn && w.stage === bn.stage
            ? <span>{w.stage} <Chip color={C.red}>{t.bottleneckTag}</Chip></span>
            : w.stage}
          value={w.count}
          max={maxWip}
          color={bn && w.stage === bn.stage ? C.red : ageColor(w.avgAge || 0)}
          suffix={`${w.avgAge != null ? ` · ${fmt(w.avgAge)}${t.dayUnit}` : ''}${w.stuck ? ` · ${fmt(w.stuck)} ${t.stuckLabel}` : ''}`}
        />
      ))}

      {(flow.projectBottlenecks || []).length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 6 }}>{t.projectBottlenecks}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {flow.projectBottlenecks.map((p) => (
              <span key={p.project} style={{ fontSize: 12.5, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 9px' }}>
                <strong>{p.project}</strong> → {p.stage} <span style={{ color: C.muted }}>({fmt(p.count)} · {fmt(p.avgAge)}{t.dayUnit})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, color: C.muted, margin: '14px 0 6px' }}>{t.agingWip}</div>
      {isMobile ? (
        <div>
          {aging.map((x) => (
            <div key={x.key} style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <KeyLink k={x.key} />
                <span style={{ color: ageColor(x.daysInStatus), fontWeight: 700 }}>{fmt(x.daysInStatus)} {t.dayUnit}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                {x.project} · {x.status} · {x.assignee || '—'}
              </div>
            </div>
          ))}
          {aging.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>—</div>}
        </div>
      ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr>
              <Th>{t.thKey}</Th>
              <Th>{t.fProject}</Th>
              <Th>{t.thStatus}</Th>
              <Th>{t.thAssignee}</Th>
              <Th align="center">{t.ageDays}</Th>
            </tr>
          </thead>
          <tbody>
            {aging.map((x) => (
              <tr key={x.key}>
                <Td><KeyLink k={x.key} /></Td>
                <Td>{x.project}</Td>
                <Td>{x.status}</Td>
                <Td>{x.assignee || '—'}</Td>
                <Td align="center"><span style={{ color: ageColor(x.daysInStatus), fontWeight: 600 }}>{fmt(x.daysInStatus)}</span></Td>
              </tr>
            ))}
            {aging.length === 0 && <tr><Td align="center">—</Td></tr>}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

// رسم الاتجاه (SVG، بلا مكتبات): خطوط · مساحات متراكمة · أعمدة متراكمة
function TrendChart({ series }) {
  const { t, fmt } = useUI();
  const [type, setType] = useState('area');
  if (!series || series.length === 0) {
    return <div style={{ color: C.muted, fontSize: 13 }}>{t.trendEmpty}</div>;
  }
  const W = 1000;
  const H = 240;
  const padL = 38;
  const padB = 26;
  const padT = 12;
  const keys = ['overdue', 'stagnant', 'review', 'unassigned'];
  const n = series.length;
  const totals = series.map((d) => keys.reduce((s, k) => s + (d[k] || 0), 0));
  const stacked = type !== 'lines';
  const maxVal = stacked
    ? Math.max(1, ...totals)
    : Math.max(1, ...series.flatMap((d) => keys.map((k) => d[k] || 0)));

  const x = (i) => padL + (n === 1 ? (W - padL - 10) / 2 : (i * (W - padL - 10)) / (n - 1));
  const y = (v) => padT + (1 - v / maxVal) * (H - padT - padB);

  // خطوط الشبكة الأفقية + قيمها
  const ticks = 4;
  const gridlines = Array.from({ length: ticks + 1 }, (_, i) => Math.round((maxVal / ticks) * i));

  // قيم متراكمة لكل يوم (للمساحات/الأعمدة)
  const stacks = series.map((d) => {
    let base = 0;
    return keys.map((k) => { const v = d[k] || 0; const seg = { k, base, top: base + v }; base += v; return seg; });
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginBottom: 6 }}>
        {[['area', t.chartArea], ['bars', t.chartBars], ['lines', t.chartLines]].map(([k, label]) => (
          <button key={k} onClick={() => setType(k)} style={{ ...ghostBtn, ...(type === k ? { background: C.green, color: '#fff', border: 0 } : {}) }}>{label}</button>
        ))}
      </div>
      {series.length < 2 && (
        <div style={{ color: C.amber, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>
          {t.trendCollecting(series.length)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 600, height: H }}>
        {/* الشبكة */}
        {gridlines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={y(g)} x2={W - 10} y2={y(g)} style={{ stroke: C.border }} strokeDasharray="3 3" opacity="0.6" />
            <text x={padL - 6} y={y(g) + 3} textAnchor="end" fontSize="10" style={{ fill: C.muted }}>{fmt(g)}</text>
          </g>
        ))}

        {type === 'lines' && keys.map((k) => (
          <g key={k}>
            <polyline points={series.map((d, i) => `${x(i)},${y(d[k] || 0)}`).join(' ')} fill="none" stroke={EXC_COLORS[k]} strokeWidth="2" />
            {series.map((d, i) => <circle key={i} cx={x(i)} cy={y(d[k] || 0)} r="2.2" fill={EXC_COLORS[k]} />)}
          </g>
        ))}

        {type === 'area' && keys.map((k, ki) => {
          const tops = stacks.map((segs) => segs[ki]);
          const pts = [
            ...tops.map((p, i) => `${x(i)},${y(p.top)}`),
            ...tops.map((p, i) => `${x(i)},${y(p.base)}`).reverse(),
          ].join(' ');
          return <polygon key={k} points={pts} fill={EXC_COLORS[k]} opacity="0.82" />;
        })}

        {type === 'bars' && stacks.map((segs, i) => {
          const bw = Math.max(2, ((W - padL - 10) / n) * 0.7);
          return (
            <g key={i}>
              {segs.map((s) => (
                <rect key={s.k} x={x(i) - bw / 2} y={y(s.top)} width={bw} height={Math.max(0, y(s.base) - y(s.top))} fill={EXC_COLORS[s.k]} />
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {keys.map((k) => (
          <span key={k} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 10, background: EXC_COLORS[k], display: 'inline-block', borderRadius: 2 }} />
            {t.exc[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

const inputStyle = { border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 8px', fontSize: 13, fontFamily: 'inherit' };
const ghostBtn = { border: `1px solid ${C.border}`, background: C.card, borderRadius: 5, padding: '5px 10px', fontSize: 13, cursor: 'pointer' };
