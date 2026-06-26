-- =====================================================================
--  قاعدة التحكّم المركزية (Control Plane) — بيانات الـ SaaS العالمية
--  منفصلة تماماً عن قواعد المستأجرين. تحوي سجلّ المنظمات (المستأجرين)
--  وبيانات توجيه النطاق الفرعي إلى قاعدة بيانات كل مستأجر.
--  العزل: لكل منظمة قاعدة بيانات MySQL مستقلّة (database-per-tenant).
-- =====================================================================

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- organizations: المستأجر — الكيان الأعلى في الـ SaaS
--   slug    = النطاق الفرعي (acme في acme.app.com) — فريد وثابت
--   db_name = اسم قاعدة بيانات المستأجر على خادم MySQL
--   db_host/db_user/db_password_enc اختيارية: للتشظية مستقبلاً
--     (قواعد على خوادم مختلفة). إن كانت NULL تُستخدم بيانات الاتصال
--     المشتركة من متغيرات البيئة (خادم واحد، عدة قواعد).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name            VARCHAR(160) NOT NULL,
  slug            VARCHAR(63)  NOT NULL,                 -- النطاق الفرعي (a-z0-9-)
  db_name         VARCHAR(80)  NOT NULL,                 -- اسم قاعدة المستأجر
  db_host         VARCHAR(255) NULL,                     -- NULL = الخادم المشترك
  db_port         INT          NULL,
  db_user         VARCHAR(128) NULL,
  db_password_enc TEXT         NULL,                     -- مشفّر (Phase 4)
  status          VARCHAR(24)  NOT NULL DEFAULT 'provisioning', -- provisioning|active|suspended|deleting
  plan            VARCHAR(32)  NOT NULL DEFAULT 'trial',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_org_slug (slug),
  UNIQUE KEY uq_org_db (db_name),
  KEY idx_org_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- reserved_slugs: نطاقات فرعية محجوزة لا يجوز لمنظمة استخدامها
--   (تُوجَّه إلى مستوى التحكّم/التسويق لا إلى مستأجر).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reserved_slugs (
  slug VARCHAR(63) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO reserved_slugs (slug) VALUES
  ('www'), ('app'), ('api'), ('admin'), ('auth'), ('static'),
  ('assets'), ('cdn'), ('mail'), ('status'), ('help'), ('support'),
  ('billing'), ('account'), ('signup'), ('login'), ('dashboard')
ON DUPLICATE KEY UPDATE slug = slug;
