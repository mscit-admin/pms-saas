-- آخر مَن عدّل التذكرة في جيرا (أي تغيير: حقل/حالة/تعليق) + وقته.
SET @c1 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='last_edited_by');
SET @d1 := IF(@c1=0, 'ALTER TABLE tickets ADD COLUMN last_edited_by VARCHAR(255) NULL', 'SELECT 1');
PREPARE s1 FROM @d1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c2 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='last_edited_at');
SET @d2 := IF(@c2=0, 'ALTER TABLE tickets ADD COLUMN last_edited_at DATETIME NULL', 'SELECT 1');
PREPARE s2 FROM @d2; EXECUTE s2; DEALLOCATE PREPARE s2;
