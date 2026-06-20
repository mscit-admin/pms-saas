-- =====================================================================
--  مراقب جيرا — لقطة يومية لتوزيع العمل الجاري على الحالات (لرسم التدفّق عبر الزمن)
-- =====================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS wip_snapshots (
  snapshot_date DATE         NOT NULL,
  status        VARCHAR(128) NOT NULL,
  count         INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (snapshot_date, status),
  KEY idx_date (snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
