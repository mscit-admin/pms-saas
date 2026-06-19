'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AdminPanel from './AdminPanel';

// ===================================================================
//  مراقب جيرا — لوحة الاستثناءات (واجهة) · ثنائية اللغة AR/EN
//  نمط البيت (Frappe/ERPNext). تتغذّى بالكامل من مسارات /api.
// ===================================================================

const C = {
  bg: '#f4f5f6',
  card: '#ffffff',
  border: '#e2e6e9',
  text: '#1f272e',
  muted: '#6b7785',
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
    trendEmpty: 'لا لقطات اتجاه بعد — تتراكم يومياً مع كل مزامنة.',
    trendCollecting: (n) => `الاتجاه يتراكم يومياً — يوجد ${n} يوم حتى الآن، يظهر الخط بعد يومين أو أكثر.`,
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
    trendEmpty: 'No trend snapshots yet — they accumulate daily with each sync.',
    trendCollecting: (n) => `Trend is building daily — ${n} day(s) so far; a line appears once there are 2+ days.`,
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

// ------------------------------------------------------------------- shell
export default function JiraExceptionMonitor() {
  const [lang, setLang] = useState('ar');
  const [tab, setTab] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [meta, setMeta] = useState(null);
  const [me, setMe] = useState(null);

  // المستخدم الحالي وصلاحياته
  useEffect(() => {
    fetchJson('/api/auth/me').then((d) => setMe(d.user)).catch(() => {});
  }, []);

  // استعادة اللغة المحفوظة وضبط اتجاه الصفحة
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
    if (saved === 'ar' || saved === 'en') setLang(saved);
  }, []);

  useEffect(() => {
    const t = DICT[lang];
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    localStorage.setItem('lang', lang);
  }, [lang]);

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
    <LangCtx.Provider value={{ lang, t, fmt, fmtDate, fmtDateTime, jiraBaseUrl: meta?.jiraBaseUrl || null, perms }}>
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
        <header
          style={{
            background: C.card,
            borderBottom: `1px solid ${C.border}`,
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 20 }}>{t.title}</h1>
            <p style={{ margin: '2px 0 0', color: C.muted, fontSize: 13 }}>
              {t.subtitle} · {t.lastSync}: {fmtDateTime(meta?.lastSyncAt)}
            </p>
          </div>
          <nav style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {tabs.map((k) => (
              <TabButton key={k} active={tab === k} onClick={() => setTab(k)}>
                {tabLabel(k)}
              </TabButton>
            ))}
            <button onClick={refresh} title={t.refresh} style={ghostBtn}>↻ {t.refresh}</button>
            <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} title={t.other} style={ghostBtn}>
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

        <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
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
  const { t } = useUI();
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

  useEffect(() => {
    if (!ticket) return;
    fetchJson(`/api/tickets/${ticket.key}/assign`).then((d) => setAssignees(d.assignees)).catch(() => {});
    fetchJson(`/api/tickets/${ticket.key}/transition`).then((d) => setTransitions(d.transitions)).catch(() => {});
    fetchJson(`/api/tickets/${ticket.key}/fields`).then((d) => setEditFields(d.fields)).catch(() => {});
  }, [ticket]);

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
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 10, padding: 20, width: 420, maxWidth: '90vw', boxShadow: '0 6px 24px rgba(0,0,0,.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{ticket.key} — {t.actions}</h3>
          <button onClick={onClose} style={ghostBtn}>{t.close}</button>
        </div>

        {/* تعليق */}
        <label style={{ fontSize: 13, color: C.muted }}>{t.comment}</label>
        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box', ...inputStyle, marginBottom: 6 }} />
        <button disabled={busy || !commentText.trim()} onClick={() => run(async () => { await postJson(`/api/tickets/${ticket.key}/comment`, { body: commentText }); setCommentText(''); })} style={{ ...ghostBtn, marginBottom: 14 }}>{t.send}</button>

        {/* إسناد */}
        <label style={{ fontSize: 13, color: C.muted, display: 'block' }}>{t.assign}</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
            <option value="">{t.pick}</option>
            <option value="__unassign__">— {t.unassign} —</option>
            {assignees.map((a) => <option key={a.accountId} value={a.accountId}>{a.name}</option>)}
          </select>
          <button disabled={busy || !accountId} onClick={() => run(() => postJson(`/api/tickets/${ticket.key}/assign`, { accountId: accountId === '__unassign__' ? null : accountId }))} style={ghostBtn}>{t.apply}</button>
        </div>

        {/* تعديل الحقول (لتلبية شروط الانتقالات مثل labels) */}
        {editFields.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: C.muted, display: 'block', marginBottom: 4 }}>{t.editFields}</label>
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

        {msg && <div style={{ color: C.green, fontSize: 13, marginTop: 10 }}>{msg}</div>}
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- العملياتي
function OperationalTab() {
  const { t, fmt, fmtDate, perms } = useUI();
  const canAct = (perms || []).includes('act_tickets');
  const [actionTicket, setActionTicket] = useState(null);
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
    (fStatus.length === 0 || fStatus.includes(x.status))
  ), [items, fAssignee, fProject, fPriority, fStatus]);

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
          <button onClick={() => downloadCsv(filtered, t)} style={{ ...ghostBtn, marginInlineStart: 'auto' }}>⬇ {t.exportCsv}</button>
        </div>
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
                {canAct && <Th align="center">{t.actions}</Th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((it) => (
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
                  {canAct && (
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
  const { t } = useUI();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [sla, setSla] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, tr, sl, c] = await Promise.all([
          fetchJson('/api/analytics/summary'),
          fetchJson('/api/analytics/trend?days=30'),
          fetchJson('/api/analytics/sla-forecast'),
          fetchJson('/api/analytics/cycle-time?days=90'),
        ]);
        setSummary(s);
        setTrend(tr.series);
        setSla(sl);
        setCycle(c);
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
  const atRisk = (sla?.items || []).filter((x) => x.slaStatus !== 'on_track').slice(0, 30);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label={t.sTotal} value={summary.totalTickets} color={C.blue} />
        <StatCard label={t.sOpen} value={summary.openTickets} color={C.amber} />
        <StatCard label={t.sDone} value={summary.doneTickets} color={C.green} />
        <StatCard label={t.sBreached} value={summary.slaBreached} color={C.red} />
        <StatCard label={t.sAvgCycle} value={summary.avgCycleDays} color={C.purple} />
      </div>

      <Card title={t.trend}>
        <TrendChart series={trend} />
      </Card>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px' }}>
          <Card title={t.sla}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <StatCard label={t.slaState.breached} value={sla.summary.breached} color={C.red} />
              <StatCard label={t.slaState.at_risk} value={sla.summary.at_risk} color={C.amber} />
              <StatCard label={t.slaState.on_track} value={sla.summary.on_track} color={C.green} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th>{t.thKey}</Th>
                  <Th>{t.thPriority}</Th>
                  <Th align="center">{t.thRemaining}</Th>
                  <Th>{t.thStatus}</Th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((x) => (
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

// رسم خطّي بسيط للاتجاه (SVG، بلا مكتبات خارجية)
function TrendChart({ series }) {
  const { t } = useUI();
  if (!series || series.length === 0) {
    return <div style={{ color: C.muted, fontSize: 13 }}>{t.trendEmpty}</div>;
  }
  const W = 1000;
  const H = 220;
  const pad = 30;
  const keys = ['overdue', 'stagnant', 'review', 'unassigned'];
  const maxVal = Math.max(1, ...series.flatMap((d) => keys.map((k) => d[k] || 0)));
  const n = series.length;
  const x = (i) => pad + (n === 1 ? (W - 2 * pad) / 2 : (i * (W - 2 * pad)) / (n - 1));
  const y = (v) => H - pad - (v / maxVal) * (H - 2 * pad);

  return (
    <div style={{ overflowX: 'auto' }}>
      {series.length < 2 && (
        <div style={{ color: C.amber, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>
          {t.trendCollecting(series.length)}
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 600, height: H }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={C.border} />
        {keys.map((k) => {
          const pts = series.map((d, i) => `${x(i)},${y(d[k] || 0)}`).join(' ');
          return (
            <g key={k}>
              <polyline points={pts} fill="none" stroke={EXC_COLORS[k]} strokeWidth="2" />
              {series.map((d, i) => (
                <circle key={i} cx={x(i)} cy={y(d[k] || 0)} r="2.5" fill={EXC_COLORS[k]} />
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        {keys.map((k) => (
          <span key={k} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 3, background: EXC_COLORS[k], display: 'inline-block' }} />
            {t.exc[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

const inputStyle = { border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 8px', fontSize: 13, fontFamily: 'inherit' };
const ghostBtn = { border: `1px solid ${C.border}`, background: C.card, borderRadius: 5, padding: '5px 10px', fontSize: 13, cursor: 'pointer' };
