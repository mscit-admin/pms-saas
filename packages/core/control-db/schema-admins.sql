-- المشرفون الأعلون (Super-admins) — حسابات إدارة المنصّة في قاعدة التحكّم،
-- منفصلة تماماً عن مستخدمي المستأجرين. لها جلستها وكوكيّها الخاصّ.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS control_admins (
  id            BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(64)  NOT NULL,
  full_name     VARCHAR(255) NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ctrl_admin (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
