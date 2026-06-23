-- =====================================================================
--  مراقب جيرا — تفضيل اللغة لكل مستخدم (إضافة عمود idempotent)
-- =====================================================================
SET NAMES utf8mb4;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'lang'
);
SET @sql := IF(@exist = 0,
  'ALTER TABLE users ADD COLUMN lang VARCHAR(5) NOT NULL DEFAULT ''ar''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
