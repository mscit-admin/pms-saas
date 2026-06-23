-- سجلّ الاعتماديات المُلغاة (للمراجعة): يُسجَّل كل رابط حجب قبل حذفه تلقائياً
-- عندما تبلغ التذكرة الحاجبة إحدى حالات الإلغاء.
CREATE TABLE IF NOT EXISTS dependency_log (
  id             BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  blocker_key    VARCHAR(64)  NOT NULL,
  blocked_key    VARCHAR(64)  NOT NULL,
  blocker_status VARCHAR(128) NULL,
  project_key    VARCHAR(64)  NULL,
  link_id        VARCHAR(64)  NULL,
  removed        TINYINT(1)   NOT NULL DEFAULT 0,   -- هل حُذف الرابط من جيرا فعلاً
  cleared_at     DATETIME     NOT NULL,
  UNIQUE KEY uq_edge_link (blocker_key, blocked_key, link_id),
  KEY idx_cleared (cleared_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
