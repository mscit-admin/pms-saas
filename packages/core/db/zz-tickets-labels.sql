-- إضافة عمود labels لجدول tickets (وسوم جيرا). آمن للتشغيل المتكرّر.
-- يُسمّى بـ zz- ليُطبَّق بعد schema.sql (الذي يُنشئ جدول tickets).
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'labels'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE tickets ADD COLUMN labels VARCHAR(1024) NULL AFTER reporter_name',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
