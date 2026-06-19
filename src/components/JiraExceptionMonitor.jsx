'use client';

import { useCallback, useEffect, useState } from 'react';

// ===================================================================
//  مراقب جيرا — لوحة الاستثناءات (واجهة)
//  عربي RTL · نمط البيت (Frappe/ERPNext) · تبويبان: تشغيلي + إداري
//  تتغذّى بالكامل من مسارات /api (لا اتصال بجيرا من المتصفح).
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

// لون/تسمية كل نوع استثناء
const EXC = {
  overdue: { ar: 'متأخر', color: C.red },
  stagnant: { ar: 'راكد', color: C.amber },
  review: { ar: 'مراجعة', color: C.blue },
  unassigned: { ar: 'بدون مسؤول', color: C.purple },
};

const SLA = {
  breached: { ar: 'متجاوز', color: C.red },
  at_risk: { ar: 'معرّض للخطر', color: C.amber },
  on_track: { ar: 'ضمن المهلة', color: C.green },
};

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'خطأ في الخادم');
  return body.data;
}

const fmt = (n) => (n == null ? '—' : new Intl.NumberFormat('ar-EG').format(n));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ar-EG') : '—');

// ------------------------------------------------------------------- shell
export default function JiraExceptionMonitor() {
  const [tab, setTab] = useState('operational');

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <header
        style={{
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>مراقب جيرا — لوحة الاستثناءات</h1>
          <p style={{ margin: '2px 0 0', color: C.muted, fontSize: 13 }}>
            ما يحتاج تدخّل المدير فقط — تحديث تلقائي كل بضع دقائق
          </p>
        </div>
        <nav style={{ display: 'flex', gap: 8 }}>
          <TabButton active={tab === 'operational'} onClick={() => setTab('operational')}>
            تشغيلي
          </TabButton>
          <TabButton active={tab === 'managerial'} onClick={() => setTab('managerial')}>
            إداري
          </TabButton>
        </nav>
      </header>

      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {tab === 'operational' ? <OperationalTab /> : <ManagerialTab />}
      </main>
    </div>
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
    <section
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {title && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

function StatCard({ label, value, color }) {
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

function Th({ children, align = 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '8px 10px',
        borderBottom: `2px solid ${C.border}`,
        color: C.muted,
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'right' }) {
  return (
    <td style={{ textAlign: align, padding: '8px 10px', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      {children}
    </td>
  );
}

function Loading() {
  return <div style={{ color: C.muted, padding: 20, textAlign: 'center' }}>… جارٍ التحميل</div>;
}
function ErrorBox({ message }) {
  return (
    <div style={{ color: C.red, padding: 14, background: `${C.red}10`, borderRadius: 6, fontSize: 13 }}>
      تعذّر التحميل: {message}
    </div>
  );
}

// شريط أفقي بسيط (للأعباء / الأولويات / المراحل)
function BarRow({ label, value, max, color, suffix }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <div style={{ width: 160, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ flex: 1, background: C.bg, borderRadius: 4, height: 18, position: 'relative' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4 }} />
      </div>
      <div style={{ width: 70, fontSize: 13, color: C.muted }}>
        {fmt(value)}
        {suffix || ''}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- العملياتي
function OperationalTab() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} />;

  const counts = data?.counts || {};
  const maxLoad = Math.max(1, ...(workload || []).map((w) => w.openCount));

  return (
    <>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <StatCard label="متأخر عن الاستحقاق" value={counts.overdue} color={C.red} />
        <StatCard label="راكد > 3 أيام" value={counts.stagnant} color={C.amber} />
        <StatCard label="مراجعة متأخرة" value={counts.review} color={C.blue} />
        <StatCard label="بدون مسؤول" value={counts.unassigned} color={C.purple} />
      </div>

      <Card
        title={`الاستثناءات (${fmt(data?.total)})`}
        extra={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: C.muted }}>من</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
            <span style={{ color: C.muted }}>إلى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); }} style={ghostBtn}>
                مسح
              </button>
            )}
          </div>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>المفتاح</Th>
                <Th>الملخّص</Th>
                <Th>الحالة</Th>
                <Th>الأولوية</Th>
                <Th>المسؤول</Th>
                <Th>الاستحقاق</Th>
                <Th align="center">أيام بالحالة</Th>
                <Th>الأسباب</Th>
              </tr>
            </thead>
            <tbody>
              {(data?.items || []).slice(0, 200).map((it) => (
                <tr key={it.id}>
                  <Td><strong>{it.key}</strong></Td>
                  <Td>{it.summary}</Td>
                  <Td>{it.status}</Td>
                  <Td>{it.priority}</Td>
                  <Td>{it.assignee || <span style={{ color: C.red }}>—</span>}</Td>
                  <Td>{fmtDate(it.dueDate)}</Td>
                  <Td align="center">{fmt(it.daysInStatus)}</Td>
                  <Td>
                    {it.reasons.map((r) => (
                      <Chip key={r} color={EXC[r]?.color}>{EXC[r]?.ar || r}</Chip>
                    ))}
                  </Td>
                </tr>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <tr><Td align="center">لا استثناءات 🎉</Td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="أعباء الفريق — أداة توازن، لا محاسبة فردية">
        {(workload || []).map((w) => (
          <BarRow
            key={w.accountId || w.assignee}
            label={w.assignee}
            value={w.openCount}
            max={maxLoad}
            color={w.overdue > 0 ? C.amber : C.green}
            suffix={w.overdue > 0 ? ` (${fmt(w.overdue)} متأخر)` : ''}
          />
        ))}
      </Card>
    </>
  );
}

// ------------------------------------------------------------------- الإداري
function ManagerialTab() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [sla, setSla] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, t, sl, c] = await Promise.all([
          fetchJson('/api/analytics/summary'),
          fetchJson('/api/analytics/trend?days=30'),
          fetchJson('/api/analytics/sla-forecast'),
          fetchJson('/api/analytics/cycle-time?days=90'),
        ]);
        setSummary(s);
        setTrend(t.series);
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
        <StatCard label="إجمالي التذاكر" value={summary.totalTickets} color={C.blue} />
        <StatCard label="مفتوحة" value={summary.openTickets} color={C.amber} />
        <StatCard label="منجزة" value={summary.doneTickets} color={C.green} />
        <StatCard label="متجاوزة SLA" value={summary.slaBreached} color={C.red} />
        <StatCard label="متوسط زمن الدورة (يوم)" value={summary.avgCycleDays} color={C.purple} />
      </div>

      <Card title="اتجاه الاستثناءات — آخر 30 يوماً">
        <TrendChart series={trend} />
      </Card>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px' }}>
          <Card title="تنبؤ SLA">
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <StatCard label="متجاوز" value={sla.summary.breached} color={C.red} />
              <StatCard label="معرّض للخطر" value={sla.summary.at_risk} color={C.amber} />
              <StatCard label="ضمن المهلة" value={sla.summary.on_track} color={C.green} />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th>المفتاح</Th>
                  <Th>الأولوية</Th>
                  <Th align="center">أيام متبقية</Th>
                  <Th>الحالة</Th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((x) => (
                  <tr key={x.key}>
                    <Td><strong>{x.key}</strong></Td>
                    <Td>{x.priority}</Td>
                    <Td align="center">{fmt(x.daysRemaining)}</Td>
                    <Td><Chip color={SLA[x.slaStatus]?.color}>{SLA[x.slaStatus]?.ar}</Chip></Td>
                  </tr>
                ))}
                {atRisk.length === 0 && <tr><Td align="center">لا تذاكر معرّضة 🎉</Td></tr>}
              </tbody>
            </table>
          </Card>
        </div>

        <div style={{ flex: '1 1 340px' }}>
          <Card title="زمن الدورة حسب الأولوية (يوم)">
            {(cycle?.cycle?.byPriority || []).map((p) => (
              <BarRow key={p.priority} label={p.priority} value={p.avgDays || 0} max={maxCycle} color={C.purple} suffix=" يوم" />
            ))}
          </Card>

          <Card title="زمن البقاء في كل مرحلة (يوم)">
            {(cycle?.stages || []).slice(0, 8).map((s) => (
              <BarRow key={s.stage} label={s.stage} value={s.avgDays || 0} max={maxStage} color={C.blue} suffix=" يوم" />
            ))}
            {(!cycle?.stages || cycle.stages.length === 0) && (
              <div style={{ color: C.muted, fontSize: 13 }}>لا بيانات مراحل كافية بعد.</div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

// رسم خطّي بسيط لاتجاه الاستثناءات (SVG، بلا مكتبات خارجية)
function TrendChart({ series }) {
  if (!series || series.length === 0) {
    return <div style={{ color: C.muted, fontSize: 13 }}>لا لقطات اتجاه بعد — تتراكم يومياً مع كل مزامنة.</div>;
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
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 600, height: H }}>
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke={C.border} />
        {keys.map((k) => {
          const pts = series.map((d, i) => `${x(i)},${y(d[k] || 0)}`).join(' ');
          return (
            <g key={k}>
              <polyline points={pts} fill="none" stroke={EXC[k].color} strokeWidth="2" />
              {series.map((d, i) => (
                <circle key={i} cx={x(i)} cy={y(d[k] || 0)} r="2.5" fill={EXC[k].color} />
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8 }}>
        {keys.map((k) => (
          <span key={k} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 3, background: EXC[k].color, display: 'inline-block' }} />
            {EXC[k].ar}
          </span>
        ))}
      </div>
    </div>
  );
}

const inputStyle = {
  border: `1px solid ${C.border}`,
  borderRadius: 5,
  padding: '5px 8px',
  fontSize: 13,
  fontFamily: 'inherit',
};
const ghostBtn = {
  border: `1px solid ${C.border}`,
  background: C.card,
  borderRadius: 5,
  padding: '5px 10px',
  fontSize: 13,
  cursor: 'pointer',
};
