-- ربط المشروع بحساب جيرا الذي يتبعه، ووسم كل تذكرة بحسابها (للكتابة بالحساب الصحيح).
SET @c1 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projects' AND COLUMN_NAME='account_id');
SET @d1 := IF(@c1=0, 'ALTER TABLE projects ADD COLUMN account_id BIGINT UNSIGNED NULL, ADD KEY idx_proj_account (account_id)', 'SELECT 1');
PREPARE s1 FROM @d1; EXECUTE s1; DEALLOCATE PREPARE s1;

SET @c2 := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND COLUMN_NAME='account_id');
SET @d2 := IF(@c2=0, 'ALTER TABLE tickets ADD COLUMN account_id BIGINT UNSIGNED NULL, ADD KEY idx_ticket_account (account_id)', 'SELECT 1');
PREPARE s2 FROM @d2; EXECUTE s2; DEALLOCATE PREPARE s2;
