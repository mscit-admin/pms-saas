import { iterateIssues, fetchChangelog, getIssue } from './jira.js';
import { getPool, withTransaction } from './db.js';
import { mapIssueToRow, extractStatusChanges, extractBlocks, computeLastEdit } from './normalize.js';
import { snapshotExceptions } from './exceptions.js';
import { snapshotWip } from './analytics.js';
import { detectAndAlert } from './alerts.js';
import { processClearedDependencies } from './dependencies.js';
import { getActiveAccounts, accountForIssueKey } from './jiraAccounts.js';

// محرّك السحب: يجلب التذاكر من جيرا، يحدّث جدول tickets (upsert)،
// ويُدرج تغيّرات الحالة الجديدة في ticket_history (idempotent عبر change_id).

const UPSERT_TICKET = `
  INSERT INTO tickets (
    id, issue_key, project_key, summary, issue_type, status, status_category,
    priority, assignee_account_id, assignee_name, reporter_account_id, reporter_name, labels,
    jira_created_at, jira_updated_at, due_date, resolved_at, last_status_change_at,
    last_edited_by, last_edited_at, account_id, synced_at
  ) VALUES (
    :id, :issue_key, :project_key, :summary, :issue_type, :status, :status_category,
    :priority, :assignee_account_id, :assignee_name, :reporter_account_id, :reporter_name, :labels,
    :jira_created_at, :jira_updated_at, :due_date, :resolved_at, :last_status_change_at,
    :last_edited_by, :last_edited_at, :account_id, :synced_at
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
    last_edited_by = VALUES(last_edited_by),
    last_edited_at = VALUES(last_edited_at),
    account_id = VALUES(account_id),
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
async function persistIssue(issue, account = null) {
  const syncedAt = nowUtc();
  const row = mapIssueToRow(issue, syncedAt);
  row.account_id = account?.id || null;

  // نقطة البحث الجديدة قد لا تُرجع changelog (أو تُرجعه فارغاً) — نجلبه من
  // نقطته المخصّصة عند غيابه أو فراغه، كي يُحسب «آخر مَن عدّل» بشكل موثوق.
  const cl = issue.changelog;
  if (!cl || !Array.isArray(cl.histories) || cl.histories.length === 0) {
    issue.changelog = await fetchChangelog(issue.id, account);
  }
  // أعِد حساب آخر مَن عدّل بعد ضمان تحميل الـ changelog كاملاً.
  const lastEdit = computeLastEdit(issue);
  row.last_edited_by = lastEdit.by;
  row.last_edited_at = lastEdit.at;
  const changes = extractStatusChanges(issue);
  row.last_status_change_at = computeLastStatusChange(changes, row.jira_created_at);
  const blocks = extractBlocks(issue);

  let inserted = 0;
  await withTransaction(async (conn) => {
    await conn.execute(UPSERT_TICKET, row);
    for (const ch of changes) {
      const [r] = await conn.execute(INSERT_HISTORY, ch);
      if (r.affectedRows > 0) inserted += 1;
    }
    // روابط الحجب: احذف روابط هذه التذكرة ثم أعد بناءها (idempotent مع إزالة الروابط المحذوفة)
    await conn.execute('DELETE FROM ticket_blocks WHERE source_key = :k', { k: issue.key });
    for (const e of blocks) {
      await conn.execute(
        'INSERT IGNORE INTO ticket_blocks (source_key, blocker_key, blocked_key, link_id) VALUES (:source_key, :blocker_key, :blocked_key, :link_id)',
        e
      );
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
    // مزامنة كل حساب جيرا نشط على حدة (كل حساب باعتماداته و JQL الخاص به).
    const accounts = await getActiveAccounts();
    for (const account of accounts) {
      // عند تمرير jql صريح يُطبَّق على كل الحسابات؛ وإلا يُستخدم JQL الحساب.
      for await (const page of iterateIssues(jql, undefined, account)) {
        for (const issue of page) {
          historyInserted += await persistIssue(issue, account);
          issuesProcessed += 1;
        }
      }
    }

    // معالجة الاعتماديات المُلغاة: تسجيل + حذف روابط جيرا للحاجبات التي بلغت حالة إلغاء
    try {
      await processClearedDependencies();
    } catch (e) {
      console.error('[deps]', e.message);
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
// يُحدَّد الحساب من سجلّ التذكرة إن وُجد، وإلا الحساب الافتراضي.
export async function syncSingleIssue(idOrKey) {
  const account = await accountForIssueKey(idOrKey);
  const issue = await getIssue(idOrKey, account);
  const historyInserted = await persistIssue(issue, account);
  await snapshotExceptions();
  return { ok: true, issueKey: issue.key, historyInserted };
}
