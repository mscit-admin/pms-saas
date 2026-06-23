-- إضافة معرّف رابط جيرا (issueLink id) لجدول ticket_blocks — لازم للحذف التلقائي.
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ticket_blocks' AND COLUMN_NAME = 'link_id');
SET @ddl := IF(@col = 0,
  'ALTER TABLE ticket_blocks ADD COLUMN link_id VARCHAR(64) NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
