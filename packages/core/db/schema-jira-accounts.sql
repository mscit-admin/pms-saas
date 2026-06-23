-- تعدّد حسابات جيرا: لكل حساب اعتماداته، ويُربط بشركة/شركات. المشاريع تشير للحساب.
CREATE TABLE IF NOT EXISTS jira_accounts (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  label       VARCHAR(160) NOT NULL,
  base_url    VARCHAR(512) NOT NULL DEFAULT '',
  email       VARCHAR(255) NOT NULL DEFAULT '',
  api_token   TEXT NULL,
  jql         VARCHAR(2048) NOT NULL DEFAULT 'ORDER BY updated DESC',
  search_path VARCHAR(255) NOT NULL DEFAULT '/rest/api/3/search/jql',
  page_size   INT NOT NULL DEFAULT 100,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_account_label (label)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ربط الحساب بالشركات (many-to-many)
CREATE TABLE IF NOT EXISTS company_jira_accounts (
  company_id BIGINT UNSIGNED NOT NULL,
  account_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (company_id, account_id),
  KEY idx_cja_account (account_id),
  CONSTRAINT fk_cja_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_cja_account FOREIGN KEY (account_id) REFERENCES jira_accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
