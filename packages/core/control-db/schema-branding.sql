-- أصول هوية المنصّة (شعار/أيقونة) مخزّنة في قاعدة التحكّم كـ BLOB —
-- معزولة عن أصول المستأجرين، وتُخدَم عبر /api/control/branding/asset/<type>.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS control_brand_assets (
  type       VARCHAR(32)  PRIMARY KEY,        -- logo | favicon
  mime       VARCHAR(64)  NOT NULL,
  data       LONGBLOB     NOT NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
