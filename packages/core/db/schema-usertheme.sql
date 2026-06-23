-- =====================================================================
--  مراقب جيرا — تفضيل الثيم (فاتح/داكن) لكل مستخدم (إضافة idempotent)
-- =====================================================================
SET NAMES utf8mb4;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'theme'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE users ADD COLUMN theme VARCHAR(8) NOT NULL DEFAULT ''light''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
