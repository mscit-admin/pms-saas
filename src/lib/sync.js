import { iterateIssues } from './jira.js';
import { getPool, withTransaction } from './db.js';
import { mapIssueToRow, extractStatusChanges } from './normalize.js';
import { snapshotExceptions } from './exceptions.js';
import { jiraConfig } from './config.js';

// محرّك السحب: يجلب التذاكر من جيرا، يحدّث جدول tickets (upsert)،
// ويُدرج تغيّرات الحالة الجديدة في ticket_history (idempotent عبر change_id).

const UPSERT_TICKET = `
  INSERT INTO tickets (
    id, issue_key, project_key, summary, issue_type, status, status_category,
    priority, assignee_account_id, assignee_name, reporter_account_id, reporter_name,
    jira_created_at, jira_updated_at, due_date, resolved_at, last_status_change_at, synced_at
  ) VALUES (
    :id, :issue_key, :project_key, :summary, :issue_type, :status, :status_category,
    :priority, :assignee_account_id, :assignee_name, :reporter_account_id, :reporter_name,
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

export async function runSync({ jql = jiraConfig.jql } = {}) {
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
        const syncedAt = nowUtc();
        const row = mapIssueToRow(issue, syncedAt);
        const changes = extractStatusChanges(issue);
        row.last_status_change_at = computeLastStatusChange(changes, row.jira_created_at);

        await withTransaction(async (conn) => {
          await conn.execute(UPSERT_TICKET, row);
          for (const ch of changes) {
            const [r] = await conn.execute(INSERT_HISTORY, ch);
            if (r.affectedRows > 0) historyInserted += 1;
          }
        });
        issuesProcessed += 1;
      }
    }

    // لقطة يومية لعدد الاستثناءات (لرسم الاتجاه) — تُحدَّث لتاريخ اليوم
    await snapshotExceptions();

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
