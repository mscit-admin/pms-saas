-- تفضيل المنطقة الزمنية لكل مستخدم (لعرض الأوقات بتوقيته). 'auto' = حسب جهاز المستخدم.
-- zz- ليُطبَّق بعد schema-auth.sql (الذي يُنشئ جدول users). آمن للتكرار.
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'timezone'
);
SET @ddl := IF(@col_exists = 0,
  "ALTER TABLE users ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'auto'",
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
