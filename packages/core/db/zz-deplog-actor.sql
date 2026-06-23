-- إضافة (المنفّذ + السبب + المصدر) لسجلّ الاعتماديات المُلغاة. آمن للتكرار.
SET @c1 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dependency_log' AND COLUMN_NAME='actor_name');
SET @d1 := IF(@c1=0, 'ALTER TABLE dependency_log ADD COLUMN actor_name VARCHAR(255) NULL', 'SELECT 1');
PREPARE s1 FROM @d1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c2 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dependency_log' AND COLUMN_NAME='reason');
SET @d2 := IF(@c2=0, 'ALTER TABLE dependency_log ADD COLUMN reason VARCHAR(512) NULL', 'SELECT 1');
PREPARE s2 FROM @d2; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @c3 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='dependency_log' AND COLUMN_NAME='source');
SET @d3 := IF(@c3=0, "ALTER TABLE dependency_log ADD COLUMN source VARCHAR(16) NOT NULL DEFAULT 'auto'", 'SELECT 1');
PREPARE s3 FROM @d3; EXECUTE s3; DEALLOCATE PREPARE s3;
