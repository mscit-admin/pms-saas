import { query } from './db.js';
import { ruleConfig } from './config.js';
import { getSetting } from './settings.js';
import { scopeAnd } from './companies.js';

// تحليلات اللوحة الإدارية + أعباء الفريق. تعتمد على tickets و ticket_history و sla_config.

// ---------------------------------------------------------------------
// أعباء الفريق — أداة توازن ومساءلة بنّاءة، لا محاسبة فردية.
// لكل مُسنَد إليه: المفتوحة، قيد التنفيذ، الاستثناءات، والمتأخرة.
// ---------------------------------------------------------------------
export async function getTeamWorkload({ scope = null } = {}) {
  const sc = scopeAnd(scope, 't');
  const rows = await query(
    `SELECT
        COALESCE(t.assignee_name, 'بدون مسؤول') AS assignee,
        t.assignee_account_id AS account_id,
        COUNT(*) AS open_count,
        SUM(t.status_category = 'indeterminate') AS in_progress,
        SUM(t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) AS overdue,
        SUM(t.status_category = 'indeterminate'
            AND TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) > :stagnantDays) AS stagnant
     FROM tickets t
     WHERE t.status_category <> 'done'${sc.sql}
     GROUP BY t.assignee_name, t.assignee_account_id
     ORDER BY open_count DESC`,
    { stagnantDays: ruleConfig.stagnantDays, ...sc.params }
  );
  return rows.map((r) => ({
    assignee: r.assignee,
    accountId: r.account_id,
    openCount: Number(r.open_count),
    inProgress: Number(r.in_progress),
    overdue: Number(r.overdue),
    stagnant: Number(r.stagnant),
  }));
}

// ---------------------------------------------------------------------
// الاتجاه — عدد كل نوع استثناء عبر آخر N يوماً (من exception_snapshots).
// ---------------------------------------------------------------------
export async function getTrend({ days = 30 } = {}) {
  const rows = await query(
    `SELECT snapshot_date, exception_type, count
     FROM exception_snapshots
     WHERE snapshot_date >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)
     ORDER BY snapshot_date ASC`,
    { days }
  );
  // نعيد التشكيل إلى سلسلة لكل تاريخ
  const byDate = new Map();
  for (const r of rows) {
    const key = r.snapshot_date instanceof Date
      ? r.snapshot_date.toISOString().slice(0, 10)
      : String(r.snapshot_date).slice(0, 10);
    if (!byDate.has(key)) {
      byDate.set(key, { date: key, stagnant: 0, review: 0, overdue: 0, unassigned: 0 });
    }
    byDate.get(key)[r.exception_type] = Number(r.count);
  }
  return Array.from(byDate.values());
}

// ---------------------------------------------------------------------
// تنبؤ SLA — لكل تذكرة مفتوحة: الموعد النهائي = الإنشاء + sla_days (حسب الأولوية).
//   breached  : تجاوز الموعد
//   at_risk   : باقٍ ≤ 2 يوم
//   on_track  : غير ذلك
// ---------------------------------------------------------------------
export async function getSlaForecast({ atRiskDays = 2, scope = null } = {}) {
  const sc = scopeAnd(scope, 't');
  const rows = await query(
    `SELECT
        t.issue_key, t.summary, t.priority, t.assignee_name, t.status,
        t.jira_created_at,
        s.sla_days,
        DATE_ADD(t.jira_created_at, INTERVAL s.sla_days DAY) AS sla_deadline,
        TIMESTAMPDIFF(DAY, UTC_TIMESTAMP(),
          DATE_ADD(t.jira_created_at, INTERVAL s.sla_days DAY)) AS days_remaining
     FROM tickets t
     JOIN sla_config s ON s.priority = t.priority
     WHERE t.status_category <> 'done'${sc.sql}
     ORDER BY days_remaining ASC`,
    sc.params
  );
  return rows.map((r) => {
    const remaining = Number(r.days_remaining);
    let slaStatus = 'on_track';
    if (remaining < 0) slaStatus = 'breached';
    else if (remaining <= atRiskDays) slaStatus = 'at_risk';
    return {
      key: r.issue_key,
      summary: r.summary,
      priority: r.priority,
      assignee: r.assignee_name,
      status: r.status,
      slaDays: Number(r.sla_days),
      deadline: r.sla_deadline,
      daysRemaining: remaining,
      slaStatus,
    };
  });
}

// ---------------------------------------------------------------------
// زمن الدورة — متوسط (الإنشاء → الإنجاز) للتذاكر المُنجَزة، إجمالاً وحسب الأولوية.
// ---------------------------------------------------------------------
export async function getCycleTime({ days = 90, scope = null } = {}) {
  const sc = scopeAnd(scope, '');
  const overall = await query(
    `SELECT
        COUNT(*) AS resolved_count,
        AVG(TIMESTAMPDIFF(HOUR, jira_created_at, resolved_at)) / 24 AS avg_days,
        MIN(TIMESTAMPDIFF(HOUR, jira_created_at, resolved_at)) / 24 AS min_days,
        MAX(TIMESTAMPDIFF(HOUR, jira_created_at, resolved_at)) / 24 AS max_days
     FROM tickets
     WHERE status_category = 'done' AND resolved_at IS NOT NULL
       AND resolved_at >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)${sc.sql}`,
    { days, ...sc.params }
  );

  const byPriority = await query(
    `SELECT priority,
        COUNT(*) AS resolved_count,
        AVG(TIMESTAMPDIFF(HOUR, jira_created_at, resolved_at)) / 24 AS avg_days
     FROM tickets
     WHERE status_category = 'done' AND resolved_at IS NOT NULL
       AND resolved_at >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)${sc.sql}
     GROUP BY priority`,
    { days, ...sc.params }
  );

  const o = overall[0] || {};
  return {
    overall: {
      resolvedCount: Number(o.resolved_count || 0),
      avgDays: o.avg_days != null ? Number(Number(o.avg_days).toFixed(1)) : null,
      minDays: o.min_days != null ? Number(Number(o.min_days).toFixed(1)) : null,
      maxDays: o.max_days != null ? Number(Number(o.max_days).toFixed(1)) : null,
    },
    byPriority: byPriority.map((r) => ({
      priority: r.priority,
      resolvedCount: Number(r.resolved_count),
      avgDays: r.avg_days != null ? Number(Number(r.avg_days).toFixed(1)) : null,
    })),
  };
}

// ---------------------------------------------------------------------
// زمن البقاء في كل مرحلة — من ticket_history باستخدام دالة النافذة LEAD.
// مدة المرحلة = الفرق بين تغيّر الحالة والتغيّر التالي (MySQL 8+).
// ---------------------------------------------------------------------
export async function getStageResidence({ days = 90, scope = null } = {}) {
  const sc = scopeAnd(scope, 't');
  const rows = await query(
    `SELECT to_status AS stage,
        COUNT(*) AS transitions,
        AVG(hours_in_stage) / 24 AS avg_days
     FROM (
        SELECT
          h.to_status,
          TIMESTAMPDIFF(
            HOUR,
            h.changed_at,
            LEAD(h.changed_at) OVER (PARTITION BY h.issue_id ORDER BY h.changed_at)
          ) AS hours_in_stage
        FROM ticket_history h
        JOIN tickets t ON t.id = h.issue_id
        WHERE h.changed_at >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)${sc.sql}
     ) x
     WHERE x.hours_in_stage IS NOT NULL
     GROUP BY to_status
     ORDER BY avg_days DESC`,
    { days, ...sc.params }
  );
  return rows.map((r) => ({
    stage: r.stage,
    transitions: Number(r.transitions),
    avgDays: r.avg_days != null ? Number(Number(r.avg_days).toFixed(1)) : null,
  }));
}

// ---------------------------------------------------------------------
// تقييم الأداء: درجات للمسؤولين والمشاريع (متعدّد العوامل) + مؤشّر عام.
// أداة توازن ومساءلة بنّاءة — تُعرض القيم بسياقها (الحِمل) لا للمحاسبة الفردية.
// ---------------------------------------------------------------------
function scaler(values, invert = false) {
  const nums = values.filter((v) => v != null && Number.isFinite(v));
  if (nums.length === 0) return () => 70;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return (v) => {
    if (v == null || !Number.isFinite(v)) return 70;
    if (max === min) return 80;
    let s = (v - min) / (max - min);
    if (invert) s = 1 - s;
    return Math.round(s * 100);
  };
}

export async function getPerformance({ days = 90, scope = null } = {}) {
  const stuckDays = ruleConfig.stagnantDays;
  const sc = scopeAnd(scope, '');

  // ---- المسؤولون (لكل مسؤول داخل كل مشروع) ----
  const aDone = await query(
    `SELECT assignee_account_id AS id, assignee_name AS name, project_key AS project,
        COUNT(*) AS resolved,
        AVG(TIMESTAMPDIFF(HOUR, jira_created_at, resolved_at)) / 24 AS avg_cycle,
        SUM(due_date IS NOT NULL) AS with_due,
        SUM(due_date IS NOT NULL AND DATE(resolved_at) <= due_date) AS on_time
     FROM tickets
     WHERE status_category = 'done' AND resolved_at IS NOT NULL AND assignee_account_id IS NOT NULL
       AND resolved_at >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)${sc.sql}
     GROUP BY assignee_account_id, assignee_name, project_key`,
    { days, ...sc.params }
  );
  const aOpen = await query(
    `SELECT assignee_account_id AS id, project_key AS project, COUNT(*) AS open_count,
        SUM(status_category = 'indeterminate' AND TIMESTAMPDIFF(DAY, last_status_change_at, UTC_TIMESTAMP()) > :stuckDays) AS stuck,
        SUM(due_date IS NOT NULL AND due_date < CURRENT_DATE) AS overdue,
        SUM(last_edited_by = assignee_name AND last_edited_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)) AS engaged
     FROM tickets WHERE status_category <> 'done' AND assignee_account_id IS NOT NULL${sc.sql}
     GROUP BY assignee_account_id, project_key`,
    { stuckDays, ...sc.params }
  );
  const openById = new Map(aOpen.map((r) => [`${r.id}|${r.project}`, r]));

  const aRaw = aDone.map((r) => {
    const o = openById.get(`${r.id}|${r.project}`) || {};
    const withDue = Number(r.with_due || 0);
    const openLoad = Number(o.open_count || 0);
    const engaged = Number(o.engaged || 0);
    return {
      name: r.name || '—',
      project: r.project || '—',
      resolved: Number(r.resolved),
      avgCycleDays: r.avg_cycle != null ? Number(Number(r.avg_cycle).toFixed(1)) : null,
      onTimeRate: withDue > 0 ? Math.round((Number(r.on_time) / withDue) * 100) : null,
      openLoad,
      stuck: Number(o.stuck || 0),
      overdue: Number(o.overdue || 0),
      engaged,
      engagementRate: openLoad > 0 ? Math.round((engaged / openLoad) * 100) : null,
    };
  });

  const cycleScale = scaler(aRaw.map((x) => x.avgCycleDays), true);
  const thrScale = scaler(aRaw.map((x) => x.resolved));
  const assignees = aRaw.map((x) => {
    const onTime = x.onTimeRate == null ? 70 : x.onTimeRate;
    const cycle = cycleScale(x.avgCycleDays);
    const reliability = x.openLoad > 0 ? Math.round((1 - x.stuck / x.openLoad) * 100) : 100;
    const throughput = thrScale(x.resolved);
    const overall = Math.round(0.35 * onTime + 0.30 * cycle + 0.20 * reliability + 0.15 * throughput);
    return { ...x, scores: { onTime, cycle, reliability, throughput }, overall };
  }).sort((a, b) => b.overall - a.overall);

  // ---- المشاريع/الفِرق ----
  const tDone = await query(
    `SELECT project_key AS p,
        COUNT(*) AS resolved,
        AVG(TIMESTAMPDIFF(HOUR, jira_created_at, resolved_at)) / 24 AS avg_cycle,
        STDDEV_POP(TIMESTAMPDIFF(HOUR, jira_created_at, resolved_at) / 24) AS sd_cycle,
        SUM(due_date IS NOT NULL) AS with_due,
        SUM(due_date IS NOT NULL AND DATE(resolved_at) <= due_date) AS on_time
     FROM tickets
     WHERE status_category = 'done' AND resolved_at IS NOT NULL
       AND resolved_at >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)${sc.sql}
     GROUP BY project_key`,
    { days, ...sc.params }
  );
  const tRaw = tDone.map((r) => {
    const withDue = Number(r.with_due || 0);
    return {
      project: r.p,
      resolved: Number(r.resolved),
      avgCycleDays: r.avg_cycle != null ? Number(Number(r.avg_cycle).toFixed(1)) : null,
      sdCycle: r.sd_cycle != null ? Number(Number(r.sd_cycle).toFixed(1)) : null,
      onTimeRate: withDue > 0 ? Math.round((Number(r.on_time) / withDue) * 100) : null,
    };
  });
  const tCycleScale = scaler(tRaw.map((x) => x.avgCycleDays), true);
  const tThrScale = scaler(tRaw.map((x) => x.resolved));
  const tPredScale = scaler(tRaw.map((x) => x.sdCycle), true);
  const teams = tRaw.map((x) => {
    const onTime = x.onTimeRate == null ? 70 : x.onTimeRate;
    const cycle = tCycleScale(x.avgCycleDays);
    const predictability = tPredScale(x.sdCycle);
    const throughput = tThrScale(x.resolved);
    const overall = Math.round(0.30 * onTime + 0.25 * cycle + 0.25 * predictability + 0.20 * throughput);
    return { ...x, scores: { onTime, cycle, predictability, throughput }, overall };
  }).sort((a, b) => b.overall - a.overall);

  return { windowDays: days, assignees, teams };
}

// ---------------------------------------------------------------------
// لقطة يومية لتوزيع WIP على الحالات (تُستدعى نهاية المزامنة) — لرسم التدفّق عبر الزمن.
// ---------------------------------------------------------------------
export async function snapshotWip() {
  const rows = await query(
    `SELECT status, COUNT(*) AS cnt FROM tickets WHERE status_category <> 'done' GROUP BY status`
  );
  for (const r of rows) {
    await query(
      `INSERT INTO wip_snapshots (snapshot_date, status, count) VALUES (CURRENT_DATE, :s, :c)
       ON DUPLICATE KEY UPDATE count = VALUES(count)`,
      { s: r.status, c: Number(r.cnt) }
    );
  }
}

// تدفّق العمل عبر الزمن: سلسلة يومية لأعداد كل حالة (أعلى الحالات + "أخرى").
export async function getWipOverTime({ days = 30, top = 6 } = {}) {
  const rows = await query(
    `SELECT snapshot_date, status, count FROM wip_snapshots
     WHERE snapshot_date >= DATE_SUB(CURRENT_DATE, INTERVAL :days DAY)
     ORDER BY snapshot_date ASC`,
    { days }
  );
  if (rows.length === 0) return { series: [], statuses: [] };

  // أعلى الحالات حسب إجمالي العدّ عبر المدى
  const totals = new Map();
  for (const r of rows) totals.set(r.status, (totals.get(r.status) || 0) + Number(r.count));
  const ranked = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const topStatuses = ranked.slice(0, top);
  const hasOther = ranked.length > top;
  const statuses = hasOther ? [...topStatuses, 'other'] : topStatuses;

  const fmtDay = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
  const byDate = new Map();
  for (const r of rows) {
    const key = fmtDay(r.snapshot_date);
    if (!byDate.has(key)) {
      const init = { date: key };
      for (const s of statuses) init[s] = 0;
      byDate.set(key, init);
    }
    const bucket = topStatuses.includes(r.status) ? r.status : 'other';
    if (statuses.includes(bucket)) byDate.get(key)[bucket] += Number(r.count);
  }
  return { series: Array.from(byDate.values()), statuses };
}

// ---------------------------------------------------------------------
// الإنتاجية والتنبؤ: المنجَز أسبوعياً + تقدير متى يُستنزف المتراكم بالوتيرة الحالية.
// ---------------------------------------------------------------------
export async function getThroughput({ weeks = 12, scope = null } = {}) {
  const sc = scopeAnd(scope, '');
  const sct = scopeAnd(scope, 't');
  const rows = await query(
    `SELECT DATE_SUB(DATE(resolved_at), INTERVAL WEEKDAY(resolved_at) DAY) AS wk, COUNT(*) AS cnt
     FROM tickets
     WHERE status_category = 'done' AND resolved_at IS NOT NULL
       AND resolved_at >= DATE_SUB(CURRENT_DATE, INTERVAL :weeks WEEK)${sc.sql}
     GROUP BY wk ORDER BY wk ASC`,
    { weeks, ...sc.params }
  );
  const fmtWk = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10));
  const series = rows.map((r) => ({ week: fmtWk(r.wk), count: Number(r.cnt) }));

  // إثنين الأسبوع الحالي (لاستبعاد الأسبوع الجزئي من المتوسط)
  const now = new Date();
  const offset = (now.getUTCDay() + 6) % 7;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - offset);
  const curWeek = monday.toISOString().slice(0, 10);

  const base = series.length > 1 ? series.filter((s) => s.week !== curWeek) : series;
  const avgWeekly = base.length ? Math.round((base.reduce((a, s) => a + s.count, 0) / base.length) * 10) / 10 : 0;

  const totals = await query(
    `SELECT SUM(status_category <> 'done') AS open_count,
        SUM(due_date IS NOT NULL AND due_date < CURRENT_DATE AND status_category <> 'done') AS overdue
     FROM tickets WHERE 1=1${sc.sql}`,
    sc.params
  );
  const breachedRows = await query(
    `SELECT COUNT(*) AS breached FROM tickets t JOIN sla_config s ON s.priority = t.priority
     WHERE t.status_category <> 'done' AND DATE_ADD(t.jira_created_at, INTERVAL s.sla_days DAY) < UTC_TIMESTAMP()${sct.sql}`,
    sct.params
  );
  const open = Number(totals[0]?.open_count || 0);
  const overdue = Number(totals[0]?.overdue || 0);
  const breached = Number(breachedRows[0]?.breached || 0);

  const fc = (count) => {
    if (!avgWeekly || avgWeekly <= 0) return { weeks: null, date: null };
    const w = Math.ceil(count / avgWeekly);
    const date = new Date(Date.now() + w * 7 * 86400000).toISOString().slice(0, 10);
    return { weeks: w, date };
  };

  return {
    series,
    avgWeekly,
    backlog: { open, overdue, breached },
    forecast: { open: fc(open), overdue: fc(overdue), breached: fc(breached) },
  };
}

// ---------------------------------------------------------------------
// تدفّق العمل والاختناقات: توزيع WIP الحالي على المراحل + أقدم العناصر العالقة.
// (CFD حقيقي يحتاج لقطات يومية؛ هنا نعرض الحالة الراهنة وأين يتراكم العمل ويهرم.)
// ---------------------------------------------------------------------
export async function getFlow({ agingLimit = 50, scope = null } = {}) {
  const stuckDays = ruleConfig.stagnantDays;
  const sc = scopeAnd(scope, 't');
  const wipRows = await query(
    `SELECT t.status AS stage, t.status_category AS category,
        COUNT(*) AS count,
        AVG(TIMESTAMPDIFF(HOUR, t.last_status_change_at, UTC_TIMESTAMP())) / 24 AS avg_age,
        MAX(TIMESTAMPDIFF(HOUR, t.last_status_change_at, UTC_TIMESTAMP())) / 24 AS max_age,
        SUM(TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) > :stuckDays) AS stuck
     FROM tickets t WHERE t.status_category <> 'done'${sc.sql}
     GROUP BY t.status, t.status_category
     ORDER BY count DESC`,
    { stuckDays, ...sc.params }
  );

  const aging = await query(
    `SELECT t.issue_key, t.summary, t.project_key, t.status, t.priority, t.assignee_name,
        TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) AS days_in_status
     FROM tickets t WHERE t.status_category <> 'done'${sc.sql}
     ORDER BY t.last_status_change_at ASC
     LIMIT ${Math.max(1, Math.min(200, parseInt(agingLimit, 10) || 50))}`,
    sc.params
  );

  // اختناق كل مشروع: المرحلة الأعلى (العدد × متوسط العمر) داخل المشروع
  const projRows = await query(
    `SELECT t.project_key AS p, t.status AS stage, COUNT(*) AS count,
        AVG(TIMESTAMPDIFF(HOUR, t.last_status_change_at, UTC_TIMESTAMP())) / 24 AS avg_age
     FROM tickets t WHERE t.status_category <> 'done'${sc.sql}
     GROUP BY t.project_key, t.status`,
    sc.params
  );
  const projMap = new Map();
  for (const r of projRows) {
    const score = Number(r.count) * Number(r.avg_age || 0);
    const cur = projMap.get(r.p);
    if (!cur || score > cur.score) {
      projMap.set(r.p, { project: r.p, stage: r.stage, count: Number(r.count), avgAge: Number(Number(r.avg_age || 0).toFixed(1)), score });
    }
  }
  const projectBottlenecks = Array.from(projMap.values()).sort((a, b) => b.score - a.score);

  // اختناقات الاعتمادية: تذاكر مفتوحة (حاجبة) تحجب تذاكر مفتوحة أخرى عبر روابط جيرا.
  // كلما زاد عدد المحجوبة وطال ركود الحاجبة، كان الاختناق أخطر.
  // تُلغى الاعتمادية (تُخفى) عندما تصل الحاجبة لفئة Done، أو لإحدى الحالات المخصّصة في الإعدادات.
  const clearedStatuses = ((await getSetting('dep_cleared_statuses', '')) || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const scDep = scopeAnd(scope, 'tb');
  const depParams = { ...scDep.params };
  let clearedFilter = '';
  if (clearedStatuses.length) {
    const ph = clearedStatuses.map((_, i) => `:dc${i}`);
    clearedFilter = ` AND tb.status NOT IN (${ph.join(', ')})`;
    clearedStatuses.forEach((s, i) => { depParams[`dc${i}`] = s; });
  }
  const depRows = await query(
    `SELECT b.blocker_key,
        tb.summary AS blocker_summary, tb.status AS blocker_status,
        tb.project_key, tb.assignee_name AS blocker_assignee,
        TIMESTAMPDIFF(DAY, tb.last_status_change_at, UTC_TIMESTAMP()) AS blocker_days,
        COUNT(DISTINCT b.blocked_key) AS blocking_count,
        GROUP_CONCAT(DISTINCT b.blocked_key ORDER BY b.blocked_key SEPARATOR ',') AS blocked_keys
     FROM ticket_blocks b
     JOIN tickets tb ON tb.issue_key = b.blocker_key
     JOIN tickets td ON td.issue_key = b.blocked_key
     WHERE tb.status_category <> 'done' AND td.status_category <> 'done'${clearedFilter}${scDep.sql}
     GROUP BY b.blocker_key, tb.summary, tb.status, tb.project_key, tb.assignee_name, tb.last_status_change_at
     ORDER BY blocking_count DESC, blocker_days DESC
     LIMIT 20`,
    depParams
  );
  const dependencies = depRows.map((r) => ({
    key: r.blocker_key,
    summary: r.blocker_summary,
    status: r.blocker_status,
    project: r.project_key,
    assignee: r.blocker_assignee,
    daysInStatus: Number(r.blocker_days || 0),
    blockingCount: Number(r.blocking_count || 0),
    blockedKeys: (r.blocked_keys || '').split(',').filter(Boolean),
  }));

  const wip = wipRows.map((r) => ({
    stage: r.stage,
    category: r.category,
    count: Number(r.count),
    avgAge: r.avg_age != null ? Number(Number(r.avg_age).toFixed(1)) : null,
    maxAge: r.max_age != null ? Number(Number(r.max_age).toFixed(1)) : null,
    stuck: Number(r.stuck || 0),
  }));

  // الاختناق العام: المرحلة التي يتراكم فيها العمل ويهرم أكثر (العدد × متوسط العمر).
  let bottleneck = null;
  for (const w of wip) {
    const score = w.count * (w.avgAge || 0);
    if (!bottleneck || score > bottleneck.score || (score === bottleneck.score && w.count > bottleneck.count)) {
      bottleneck = { stage: w.stage, count: w.count, avgAge: w.avgAge, maxAge: w.maxAge, stuck: w.stuck, score };
    }
  }

  return {
    wip,
    bottleneck,
    projectBottlenecks,
    dependencies,
    stuckDays,
    aging: aging.map((r) => ({
      key: r.issue_key,
      summary: r.summary,
      project: r.project_key,
      status: r.status,
      priority: r.priority,
      assignee: r.assignee_name,
      daysInStatus: Number(r.days_in_status),
    })),
  };
}

// ---------------------------------------------------------------------
// بطاقة صحة المشاريع (RAG) + نسبة التسليم في الموعد — لكل مشروع.
// ---------------------------------------------------------------------
export async function getProjectScorecard({ scope = null } = {}) {
  const sc = scopeAnd(scope, 't');
  const scn = scopeAnd(scope, '');
  const openRows = await query(
    `SELECT t.project_key AS p,
        COUNT(*) AS open_count,
        SUM(t.status_category = 'indeterminate'
            AND TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) > :stagnantDays) AS stagnant,
        SUM((LOWER(t.status) LIKE '%review%' OR t.status LIKE '%مراجعة%')
            AND TIMESTAMPDIFF(DAY, t.last_status_change_at, UTC_TIMESTAMP()) > :reviewDays) AS review,
        SUM(t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) AS overdue,
        SUM(t.assignee_account_id IS NULL) AS unassigned
     FROM tickets t WHERE t.status_category <> 'done'${sc.sql} GROUP BY t.project_key`,
    { stagnantDays: ruleConfig.stagnantDays, reviewDays: ruleConfig.reviewDays, ...sc.params }
  );

  const breachedRows = await query(
    `SELECT t.project_key AS p, COUNT(*) AS breached
     FROM tickets t JOIN sla_config s ON s.priority = t.priority
     WHERE t.status_category <> 'done'
       AND DATE_ADD(t.jira_created_at, INTERVAL s.sla_days DAY) < UTC_TIMESTAMP()${sc.sql}
     GROUP BY t.project_key`,
    sc.params
  );

  const doneRows = await query(
    `SELECT project_key AS p,
        COUNT(*) AS resolved_count,
        AVG(TIMESTAMPDIFF(HOUR, jira_created_at, resolved_at)) / 24 AS avg_days,
        SUM(due_date IS NOT NULL) AS with_due,
        SUM(due_date IS NOT NULL AND DATE(resolved_at) <= due_date) AS on_time
     FROM tickets WHERE status_category = 'done' AND resolved_at IS NOT NULL${scn.sql}
     GROUP BY project_key`,
    scn.params
  );

  const map = new Map();
  const get = (p) => {
    if (!map.has(p)) map.set(p, { project: p, openCount: 0, stagnant: 0, review: 0, overdue: 0, unassigned: 0, breached: 0, resolvedCount: 0, avgDays: null, withDue: 0, onTime: 0 });
    return map.get(p);
  };
  for (const r of openRows) Object.assign(get(r.p), {
    openCount: Number(r.open_count), stagnant: Number(r.stagnant || 0), review: Number(r.review || 0),
    overdue: Number(r.overdue || 0), unassigned: Number(r.unassigned || 0),
  });
  for (const r of breachedRows) get(r.p).breached = Number(r.breached || 0);
  for (const r of doneRows) Object.assign(get(r.p), {
    resolvedCount: Number(r.resolved_count), avgDays: r.avg_days != null ? Number(Number(r.avg_days).toFixed(1)) : null,
    withDue: Number(r.with_due || 0), onTime: Number(r.on_time || 0),
  });

  const rank = { red: 0, amber: 1, green: 2 };
  const out = Array.from(map.values()).map((x) => {
    const exceptions = x.stagnant + x.review + x.overdue + x.unassigned;
    const open = x.openCount || 1;
    const excRatio = exceptions / open;
    const breachRatio = x.breached / open;
    let health = 'green';
    if (breachRatio > 0.25 || excRatio > 0.6) health = 'red';
    else if (breachRatio > 0.1 || excRatio > 0.3) health = 'amber';
    const onTimeRate = x.withDue > 0 ? Math.round((x.onTime / x.withDue) * 100) : null;
    return {
      project: x.project, health, openCount: x.openCount, exceptions,
      breached: x.breached, avgCycleDays: x.avgDays, resolvedCount: x.resolvedCount, onTimeRate,
    };
  });

  out.sort((a, b) => (rank[a.health] - rank[b.health]) || (b.exceptions - a.exceptions) || (b.openCount - a.openCount));
  return out;
}

// ---------------------------------------------------------------------
// الملخص التنفيذي — أرقام أعلى المستوى للوحة الإدارية.
// ---------------------------------------------------------------------
export async function getExecutiveSummary({ scope = null } = {}) {
  const scn = scopeAnd(scope, '');
  const sc = scopeAnd(scope, 't');
  const totals = await query(
    `SELECT
        COUNT(*) AS total,
        SUM(status_category <> 'done') AS open_count,
        SUM(status_category = 'done') AS done_count,
        SUM(due_date IS NOT NULL AND due_date < CURRENT_DATE AND status_category <> 'done') AS overdue,
        SUM(assignee_account_id IS NULL AND status_category <> 'done') AS unassigned
     FROM tickets WHERE 1=1${scn.sql}`,
    scn.params
  );

  const breached = await query(
    `SELECT COUNT(*) AS breached
     FROM tickets t JOIN sla_config s ON s.priority = t.priority
     WHERE t.status_category <> 'done'
       AND DATE_ADD(t.jira_created_at, INTERVAL s.sla_days DAY) < UTC_TIMESTAMP()${sc.sql}`,
    sc.params
  );

  const cycle = await getCycleTime({ scope });
  const t = totals[0] || {};
  return {
    totalTickets: Number(t.total || 0),
    openTickets: Number(t.open_count || 0),
    doneTickets: Number(t.done_count || 0),
    overdueTickets: Number(t.overdue || 0),
    unassignedTickets: Number(t.unassigned || 0),
    slaBreached: Number(breached[0]?.breached || 0),
    avgCycleDays: cycle.overall.avgDays,
    resolvedLast90Days: cycle.overall.resolvedCount,
  };
}
