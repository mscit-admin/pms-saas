// كتالوج الصلاحيات — مفاتيح ثابتة في الكود، والأدوار تمنح أيّاً منها.
// (لا يستورد أي شيء خاص بـ Node كي يصلح في middleware على edge.)

export const PERMISSIONS = [
  { key: 'view_dashboard', labelAr: 'عرض لوحة المعلومات', labelEn: 'View dashboard' },
  { key: 'view_operational', labelAr: 'عرض التبويب التشغيلي', labelEn: 'View operational tab' },
  { key: 'view_managerial', labelAr: 'عرض التبويب الإداري', labelEn: 'View managerial tab' },
  // مؤشّرات لوحة المعلومات (KPI) — كل مؤشّر يُظهَر/يُخفى حسب الدور
  { key: 'kpi_total', labelAr: 'مؤشّر: إجمالي التذاكر', labelEn: 'KPI: Total tickets' },
  { key: 'kpi_open', labelAr: 'مؤشّر: التذاكر المفتوحة', labelEn: 'KPI: Open tickets' },
  { key: 'kpi_done', labelAr: 'مؤشّر: المنجَزة', labelEn: 'KPI: Done tickets' },
  { key: 'kpi_overdue', labelAr: 'مؤشّر: المتأخرة', labelEn: 'KPI: Overdue' },
  { key: 'kpi_unassigned', labelAr: 'مؤشّر: بلا مسؤول', labelEn: 'KPI: Unassigned' },
  { key: 'kpi_stagnant', labelAr: 'مؤشّر: الراكدة', labelEn: 'KPI: Stagnant' },
  { key: 'kpi_review', labelAr: 'مؤشّر: مراجعة متأخرة', labelEn: 'KPI: Long review' },
  { key: 'kpi_sla_breached', labelAr: 'مؤشّر: خرق SLA', labelEn: 'KPI: SLA breached' },
  { key: 'kpi_avg_cycle', labelAr: 'مؤشّر: متوسط زمن الدورة', labelEn: 'KPI: Avg cycle time' },
  { key: 'manage_sla', labelAr: 'ضبط SLA', labelEn: 'Manage SLA' },
  { key: 'trigger_sync', labelAr: 'تشغيل المزامنة', labelEn: 'Trigger sync' },
  { key: 'act_tickets', labelAr: 'إجراءات على التذاكر (إسناد/تعليق/نقل)', labelEn: 'Act on tickets (assign/comment/transition)' },
  { key: 'manage_exceptions', labelAr: 'متابعة الاستثناءات (إقرار/تأجيل/مالك)', labelEn: 'Manage exceptions (ack/snooze/owner)' },
  { key: 'manage_users', labelAr: 'إدارة المستخدمين', labelEn: 'Manage users' },
  { key: 'manage_roles', labelAr: 'إدارة الأدوار والصلاحيات', labelEn: 'Manage roles & permissions' },
  { key: 'manage_settings', labelAr: 'إدارة الإعدادات', labelEn: 'Manage settings' },
  { key: 'manage_branding', labelAr: 'إدارة الهوية (شعار/خلفية/أيقونة)', labelEn: 'Manage branding' },
  { key: 'manage_integration', labelAr: 'إدارة الربط بجيرا', labelEn: 'Manage Jira integration' },
  { key: 'view_audit', labelAr: 'عرض سجلّات الدخول والتدقيق', labelEn: 'View login & audit logs' },
  { key: 'reset_2fa', labelAr: 'إعادة ضبط التحقق الثنائي', labelEn: 'Reset 2FA' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// صلاحيات إدارية حسّاسة (الوصول لمنطقة الإدارة)
export const ADMIN_PERMISSIONS = ['manage_users', 'manage_roles', 'manage_settings', 'manage_branding', 'manage_integration', 'view_audit', 'reset_2fa'];

export function hasPermission(userPerms, key) {
  return Array.isArray(userPerms) && userPerms.includes(key);
}
