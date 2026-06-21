import { iterateIssues, fetchChangelog, getIssue } from './jira.js';
import { getPool, withTransaction } from './db.js';
import { mapIssueToRow, extractStatusChanges } from './normalize.js';
import { snapshotExceptions } from './exceptions.js';
import { snapshotWip } from './analytics.js';
import { detectAndAlert } from './alerts.js';

// محرّك السحب: يجلب التذاكر من جيرا، يحدّث جدول tickets (upsert)،
// ويُدرج تغيّرات الحالة الجديدة في ticket_history (idempotent عبر change_id).

const UPSERT_TICKET = `
  INSERT INTO tickets (
    id, issue_key, project_key, summary, issue_type, status, status_category,
    priority, assignee_account_id, assignee_name, reporter_account_id, reporter_name, labels,
    jira_created_at, jira_updated_at, due_date, resolved_at, last_status_change_at, synced_at
  ) VALUES (
    :id, :issue_key, :project_key, :summary, :issue_type, :status, :status_category,
    :priority, :assignee_account_id, :assignee_name, :reporter_account_id, :reporter_name, :labels,
    :jira_created_at, :jira_updated_at, :due_date, :resolved_at, :last_status_change_at, :synced_at
  )
  ON DUPLICATE KEY UPDATE
    issue_key = VALUES(issue_key),
    project_key = VALUES(project_key),
    summary = VALUES(summary),
    issue_type = VALUES(issue_type),
    status = VALUES(status),
    status_category = VALUES(status_category),
    priority = VALUES(priority),
    assignee_account_id = VALUES(assignee_account_id),
    assignee_name = VALUES(assignee_name),
    reporter_account_id = VALUES(reporter_account_id),
    reporter_name = VALUES(reporter_name),
    labels = VALUES(labels),
    jira_created_at = VALUES(jira_created_at),
    jira_updated_at = VALUES(jira_updated_at),
    due_date = VALUES(due_date),
    resolved_at = VALUES(resolved_at),
    last_status_change_at = VALUES(last_status_change_at),
    synced_at = VALUES(synced_at)
`;

const INSERT_HISTORY = `
  INSERT IGNORE INTO ticket_history (
    change_id, issue_id, issue_key, from_status, to_status,
    from_category, to_category, author_name, changed_at
  ) VALUES (
    :change_id, :issue_id, :issue_key, :from_status, :to_status,
    :from_category, :to_category, :author_name, :changed_at
  )
`;

function nowUtc() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// آخر تغيّر حالة = أحدث changed_at؛ وإن لم يوجد تاريخ نستخدم تاريخ الإنشاء.
function computeLastStatusChange(changes, createdAt) {
  if (changes.length === 0) return createdAt;
  return changes[changes.length - 1].changed_at || createdAt;
}

// حفظ تذكرة واحدة (upsert + تاريخها). يُعيد عدد صفوف التاريخ المُدرجة.
async function persistIssue(issue) {
  const syncedAt = nowUtc();
  const row = mapIssueToRow(issue, syncedAt);

  // نقطة البحث الجديدة قد لا تُرجع changelog — نجلبه من نقطته المخصّصة عند غيابه.
  if (!issue.changelog || !Array.isArray(issue.changelog.histories)) {
    issue.changelog = await fetchChangelog(issue.id);
  }
  const changes = extractStatusChanges(issue);
  row.last_status_change_at = computeLastStatusChange(changes, row.jira_created_at);

  let inserted = 0;
  await withTransaction(async (conn) => {
    await conn.execute(UPSERT_TICKET, row);
    for (const ch of changes) {
      const [r] = await conn.execute(INSERT_HISTORY, ch);
      if (r.affectedRows > 0) inserted += 1;
    }
  });
  return inserted;
}

// مزامنة كاملة عبر JQL (Polling). عند عدم تمرير jql يُقرأ من الإعدادات.
export async function runSync({ jql } = {}) {
  const pool = getPool();
  const startedAt = nowUtc();

  const [logResult] = await pool.execute(
    'INSERT INTO sync_log (started_at, status) VALUES (:started_at, :status)',
    { started_at: startedAt, status: 'running' }
  );
  const logId = logResult.insertId;

  let issuesProcessed = 0;
  let historyInserted = 0;

  try {
    for await (const page of iterateIssues(jql)) {
      for (const issue of page) {
        historyInserted += await persistIssue(issue);
        issuesProcessed += 1;
      }
    }

    // لقطات يومية: عدد الاستثناءات + توزيع WIP على الحالات (للاتجاه والتدفّق)
    await snapshotExceptions();
    await snapshotWip();

    // تنبيه بالاستثناءات الجديدة (إن كانت الإشعارات مهيّأة)
    try {
      await detectAndAlert();
    } catch (e) {
      console.error('[alerts]', e.message);
    }

    await pool.execute(
      `UPDATE sync_log SET finished_at = :finished_at, status = 'success',
       issues_processed = :issues, history_inserted = :history WHERE id = :id`,
      { finished_at: nowUtc(), issues: issuesProcessed, history: historyInserted, id: logId }
    );

    return { ok: true, issuesProcessed, historyInserted };
  } catch (err) {
    await pool.execute(
      `UPDATE sync_log SET finished_at = :finished_at, status = 'error',
       issues_processed = :issues, history_inserted = :history, error_message = :msg WHERE id = :id`,
      {
        finished_at: nowUtc(),
        issues: issuesProcessed,
        history: historyInserted,
        msg: String(err?.message || err).slice(0, 2000),
        id: logId,
      }
    );
    throw err;
  }
}

// مزامنة تذكرة واحدة (تُستدعى من Webhook) — تجلب التذكرة الطازجة وتحفظها.
export async function syncSingleIssue(idOrKey) {
  const issue = await getIssue(idOrKey);
  const historyInserted = await persistIssue(issue);
  await snapshotExceptions();
  return { ok: true, issueKey: issue.key, historyInserted };
}
