-- أعمدة إضافية لجدول organizations: الحصص (quotas) والوحدات (features).
-- آمنة للتكرار (تُطبَّق عند كل إقلاع) — تتحقّق من وجود العمود قبل إضافته.
-- zz- ليُطبَّق بعد schema.sql (الذي يُنشئ organizations).

-- max_users: أقصى عدد مستخدمين للمنظمة (NULL = بلا حدّ)
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'max_users');
SET @s := IF(@c = 0, 'ALTER TABLE organizations ADD COLUMN max_users INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- max_projects: أقصى عدد مشاريع (NULL = بلا حدّ)
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'max_projects');
SET @s := IF(@c = 0, 'ALTER TABLE organizations ADD COLUMN max_projects INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- sync_interval_minutes: فترة المزامنة الخاصّة بالمنظمة (NULL = الافتراضي العام)
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'sync_interval_minutes');
SET @s := IF(@c = 0, 'ALTER TABLE organizations ADD COLUMN sync_interval_minutes INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- features: مفاتيح تفعيل الوحدات (JSON) — مثال {"analytics":true,"ai":false}
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations' AND COLUMN_NAME = 'features');
SET @s := IF(@c = 0, 'ALTER TABLE organizations ADD COLUMN features JSON NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
