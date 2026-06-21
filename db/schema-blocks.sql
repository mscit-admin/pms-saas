-- روابط الحجب/الاعتمادية بين التذاكر (من issuelinks في جيرا).
-- حافة موجّهة: blocker_key يحجب blocked_key. source_key = التذكرة التي قرأنا الرابط منها
-- (لحذف روابطها وإعادة بنائها idempotent عند كل مزامنة).
CREATE TABLE IF NOT EXISTS ticket_blocks (
  source_key   VARCHAR(64) NOT NULL,
  blocker_key  VARCHAR(64) NOT NULL,
  blocked_key  VARCHAR(64) NOT NULL,
  PRIMARY KEY (source_key, blocker_key, blocked_key),
  KEY idx_blocker (blocker_key),
  KEY idx_blocked (blocked_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
