-- تعدّد الشركات: لكل شركة عدّة مشاريع، ويُسنَد المستخدم لمشاريع محدّدة داخلها.
-- العزل: المستخدم يرى فقط بيانات المشاريع المُسنَد إليها (project_key = projects.jira_key).

CREATE TABLE IF NOT EXISTS companies (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name       VARCHAR(160) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id         BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  company_id BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(160) NOT NULL,
  jira_key   VARCHAR(64)  NOT NULL,                 -- مفتاح مشروع جيرا (يطابق tickets.project_key)
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_jira (jira_key),            -- مشروع جيرا ينتمي لشركة واحدة فقط
  KEY idx_proj_company (company_id),
  CONSTRAINT fk_proj_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_projects (
  user_id    BIGINT UNSIGNED NOT NULL,
  project_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, project_id),
  KEY idx_up_project (project_id),
  CONSTRAINT fk_up_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_up_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
