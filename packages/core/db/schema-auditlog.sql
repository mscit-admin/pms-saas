-- =====================================================================
--  مراقب جيرا — سجلّ الدخول والتدقيق (Login & Audit logs)
-- =====================================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category    VARCHAR(16)  NOT NULL,        -- login | audit
  action      VARCHAR(64)  NOT NULL,        -- login_success | login_failed | user_create | ...
  actor_id    BIGINT UNSIGNED NULL,         -- المستخدم المنفّذ (إن عُرف)
  actor_name  VARCHAR(255) NULL,
  target_type VARCHAR(64)  NULL,            -- user | role | ticket | settings | jira | branding
  target_id   VARCHAR(160) NULL,
  detail      VARCHAR(1000) NULL,
  ip          VARCHAR(64)  NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cat_created (category, created_at),
  KEY idx_action (action),
  KEY idx_actor (actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
