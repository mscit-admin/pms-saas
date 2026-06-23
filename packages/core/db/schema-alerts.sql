-- =====================================================================
--  مراقب جيرا — جدول تتبّع الإشعارات (لتفادي تكرار التنبيه لنفس الاستثناء)
-- =====================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS alerted_exceptions (
  issue_key      VARCHAR(64) NOT NULL,
  exception_type VARCHAR(64) NOT NULL,   -- stagnant | review | overdue | unassigned
  alerted_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (issue_key, exception_type),
  KEY idx_alerted_at (alerted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
