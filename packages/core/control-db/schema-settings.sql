-- إعدادات المنصّة (مفتاح/قيمة) — هوية لوحة المشرف: الاسم، اللون، الشعار.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS control_settings (
  setting_key   VARCHAR(64) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- صلاحيات المشرفين الأعلين (لكل حساب مجموعة مفاتيح؛ الكتالوج في الكود).
CREATE TABLE IF NOT EXISTS control_admin_permissions (
  admin_id       BIGINT UNSIGNED NOT NULL,
  permission_key VARCHAR(64)     NOT NULL,
  PRIMARY KEY (admin_id, permission_key),
  CONSTRAINT fk_cap_admin FOREIGN KEY (admin_id) REFERENCES control_admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
