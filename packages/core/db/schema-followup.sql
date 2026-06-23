-- =====================================================================
--  مراقب جيرا — حالة المتابعة الإدارية لكل تذكرة استثناء
--  إقرار/تأجيل/مالك/سبب جذري — تحوّل اللوحة من رصد إلى متابعة مُدارة.
-- =====================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS exception_status (
  issue_key     VARCHAR(64) PRIMARY KEY,
  acknowledged  TINYINT(1)  NOT NULL DEFAULT 0,
  ack_by        BIGINT UNSIGNED NULL,   -- معرّف المستخدم الذي أقرّ
  ack_at        DATETIME    NULL,
  note          VARCHAR(500) NULL,
  snooze_until  DATE        NULL,        -- مؤجَّل حتى هذا التاريخ
  owner_user_id BIGINT UNSIGNED NULL,    -- المالك الإداري (غير مُسنَد جيرا)
  root_cause    VARCHAR(40) NULL,        -- blocked | waiting_client | ...
  updated_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_snooze (snooze_until),
  KEY idx_owner (owner_user_id),
  KEY idx_ack (acknowledged)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
