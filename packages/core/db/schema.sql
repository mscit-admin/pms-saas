-- =====================================================================
--  مراقب جيرا — مخطط قاعدة البيانات (MySQL 8.0+)
--  يتطلب MySQL 8 لاستخدام دوال النوافذ (LAG/Window Functions) في التحليلات.
--  الترميز utf8mb4 لدعم العربية والرموز.
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------
-- tickets: لقطة حالية لكل تذكرة في جيرا (تُحدَّث upsert عند كل مزامنة)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id                    BIGINT UNSIGNED PRIMARY KEY,          -- jira issue id
  issue_key             VARCHAR(64)  NOT NULL,                -- مثل OPS-123
  project_key           VARCHAR(64)  NOT NULL,
  summary               VARCHAR(1024) NOT NULL DEFAULT '',
  issue_type            VARCHAR(128) NULL,
  status                VARCHAR(128) NOT NULL,                -- اسم الحالة الظاهر
  status_category       VARCHAR(64)  NOT NULL,                -- new | indeterminate | done
  priority              VARCHAR(64)  NULL,                    -- Highest..Lowest
  assignee_account_id   VARCHAR(128) NULL,
  assignee_name         VARCHAR(255) NULL,
  reporter_account_id   VARCHAR(128) NULL,
  reporter_name         VARCHAR(255) NULL,

  jira_created_at       DATETIME     NOT NULL,
  jira_updated_at       DATETIME     NOT NULL,
  due_date              DATE         NULL,
  resolved_at           DATETIME     NULL,                    -- resolutiondate

  -- آخر لحظة تغيّرت فيها الحالة (لحساب الركود/البقاء في المرحلة)
  last_status_change_at DATETIME     NULL,
  synced_at             DATETIME     NOT NULL,

  UNIQUE KEY uq_issue_key (issue_key),
  KEY idx_status_category (status_category),
  KEY idx_assignee (assignee_account_id),
  KEY idx_priority (priority),
  KEY idx_due_date (due_date),
  KEY idx_last_change (last_status_change_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- ticket_history: كل تغيّر حالة (من changelog جيرا) — مصدر زمن الدورة والاتجاه
-- change_id فريد لكل تغيّر لضمان عدم التكرار عند إعادة السحب (idempotent)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_history (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  change_id       BIGINT UNSIGNED NOT NULL,                  -- changelog history id من جيرا
  issue_id        BIGINT UNSIGNED NOT NULL,
  issue_key       VARCHAR(64)  NOT NULL,
  from_status     VARCHAR(128) NULL,
  to_status       VARCHAR(128) NOT NULL,
  from_category   VARCHAR(64)  NULL,
  to_category     VARCHAR(64)  NULL,
  author_name     VARCHAR(255) NULL,
  changed_at      DATETIME     NOT NULL,

  UNIQUE KEY uq_change (change_id),
  KEY idx_issue (issue_id),
  KEY idx_issue_changed (issue_id, changed_at),
  KEY idx_to_status (to_status),
  CONSTRAINT fk_history_ticket FOREIGN KEY (issue_id)
    REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- sla_config: SLA حسب الأولوية (أيام) — المصدر الحقيقي، قابل للضبط من اللوحة
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sla_config (
  priority   VARCHAR(64) PRIMARY KEY,   -- High | Medium | Low (نُطبّع أولويات جيرا عليها)
  sla_days   INT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- قيم بذرية افتراضية (عالية 7 · متوسطة 14 · منخفضة 21)
INSERT INTO sla_config (priority, sla_days) VALUES
  ('High', 7), ('Medium', 14), ('Low', 21)
ON DUPLICATE KEY UPDATE sla_days = VALUES(sla_days);

-- ---------------------------------------------------------------------
-- exception_snapshots: لقطة يومية لعدد كل نوع استثناء — لرسم الاتجاه عبر الزمن
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exception_snapshots (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  snapshot_date  DATE         NOT NULL,
  exception_type VARCHAR(64)  NOT NULL,   -- stagnant | review | overdue | unassigned
  count          INT          NOT NULL DEFAULT 0,
  UNIQUE KEY uq_day_type (snapshot_date, exception_type),
  KEY idx_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- sync_log: سجل عمليات السحب (Polling) — للمراقبة والتشخيص
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_log (
  id               BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  started_at       DATETIME     NOT NULL,
  finished_at      DATETIME     NULL,
  status           VARCHAR(32)  NOT NULL DEFAULT 'running', -- running | success | error
  issues_processed INT          NOT NULL DEFAULT 0,
  history_inserted INT          NOT NULL DEFAULT 0,
  error_message    TEXT         NULL,
  KEY idx_started (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
