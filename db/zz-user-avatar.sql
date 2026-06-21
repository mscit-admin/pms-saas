-- إضافة عمود avatar_mime لجدول users (صورة الملف الشخصي). آمن للتكرار.
-- zz- ليُطبَّق بعد schema-auth.sql (الذي يُنشئ جدول users).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_mime'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN avatar_mime VARCHAR(64) NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
