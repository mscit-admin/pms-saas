// كتالوج الصلاحيات — مفاتيح ثابتة في الكود، والأدوار تمنح أيّاً منها.
// (لا يستورد أي شيء خاص بـ Node كي يصلح في middleware على edge.)

// مجموعات الصلاحيات (لتنظيم شاشة الأدوار) — مرتّبة كما تُعرض.
export const PERMISSION_GROUPS = [
  { key: 'access', labelAr: 'وصول وعرض', labelEn: 'Access & views' },
  { key: 'kpi', labelAr: 'مؤشّرات الأداء (KPI)', labelEn: 'Performance KPIs' },
  { key: 'widgets', labelAr: 'لوحات تحليلية', labelEn: 'Analytics widgets' },
  { key: 'ops', labelAr: 'إجراءات تشغيلية', labelEn: 'Operations' },
  { key: 'admin', labelAr: 'الإدارة', labelEn: 'Administration' },
  { key: 'security', labelAr: 'السجلّات والأمان', labelEn: 'Logs & security' },
  { key: 'advanced', labelAr: 'متقدّم', labelEn: 'Advanced' },
];

export const PERMISSIONS = [
  { key: 'view_dashboard', group: 'access', labelAr: 'عرض لوحة المعلومات', labelEn: 'View dashboard' },
  { key: 'view_operational', group: 'access', labelAr: 'عرض التبويب التشغيلي', labelEn: 'View operational tab' },
  { key: 'view_managerial', group: 'access', labelAr: 'عرض التبويب الإداري', labelEn: 'View managerial tab' },
  // مؤشّرات لوحة المعلومات (KPI) — كل مؤشّر يُظهَر/يُخفى حسب الدور
  { key: 'kpi_total', group: 'kpi', labelAr: 'مؤشّر: إجمالي التذاكر', labelEn: 'KPI: Total tickets' },
  { key: 'kpi_open', group: 'kpi', labelAr: 'مؤشّر: التذاكر المفتوحة', labelEn: 'KPI: Open tickets' },
  { key: 'kpi_done', group: 'kpi', labelAr: 'مؤشّر: المنجَزة', labelEn: 'KPI: Done tickets' },
  { key: 'kpi_overdue', group: 'kpi', labelAr: 'مؤشّر: المتأخرة', labelEn: 'KPI: Overdue' },
  { key: 'kpi_unassigned', group: 'kpi', labelAr: 'مؤشّر: بلا مسؤول', labelEn: 'KPI: Unassigned' },
  { key: 'kpi_stagnant', group: 'kpi', labelAr: 'مؤشّر: الراكدة', labelEn: 'KPI: Stagnant' },
  { key: 'kpi_review', group: 'kpi', labelAr: 'مؤشّر: مراجعة متأخرة', labelEn: 'KPI: Long review' },
  { key: 'kpi_sla_breached', group: 'kpi', labelAr: 'مؤشّر: خرق SLA', labelEn: 'KPI: SLA breached' },
  { key: 'kpi_avg_cycle', group: 'kpi', labelAr: 'مؤشّر: متوسط زمن الدورة', labelEn: 'KPI: Avg cycle time' },
  { key: 'kpi_on_time', group: 'kpi', labelAr: 'مؤشّر: نسبة التسليم في الموعد', labelEn: 'KPI: On-time delivery %' },
  { key: 'kpi_sla_compliance', group: 'kpi', labelAr: 'مؤشّر: امتثال SLA', labelEn: 'KPI: SLA compliance %' },
  { key: 'kpi_net_flow', group: 'kpi', labelAr: 'مؤشّر: صافي التدفّق (مُنشأ−مُنجز)', labelEn: 'KPI: Net flow (created−resolved)' },
  { key: 'kpi_unassigned_wait', group: 'kpi', labelAr: 'مؤشّر: متوسط انتظار بلا مسؤول', labelEn: 'KPI: Avg unassigned wait' },
  // عناصر لوحة المعلومات (Widgets) — كل عنصر يُظهَر/يُخفى حسب الدور
  { key: 'widget_workload', group: 'widgets', labelAr: 'لوحة: أعباء الفريق', labelEn: 'Dashboard: Team workload' },
  { key: 'widget_wip', group: 'widgets', labelAr: 'لوحة: العمل الجاري WIP', labelEn: 'Dashboard: WIP over time' },
  { key: 'widget_throughput', group: 'widgets', labelAr: 'لوحة: الإنتاجية والتنبؤ', labelEn: 'Dashboard: Throughput & forecast' },
  { key: 'widget_trend', group: 'widgets', labelAr: 'لوحة: اتجاه الاستثناءات', labelEn: 'Dashboard: Exceptions trend' },
  { key: 'widget_cycle_priority', group: 'widgets', labelAr: 'لوحة: زمن الدورة حسب الأولوية', labelEn: 'Dashboard: Cycle time by priority' },
  { key: 'widget_stage_time', group: 'widgets', labelAr: 'لوحة: الزمن في كل مرحلة', labelEn: 'Dashboard: Time in each stage' },
  { key: 'manage_sla', group: 'ops', labelAr: 'ضبط SLA', labelEn: 'Manage SLA' },
  { key: 'trigger_sync', group: 'ops', labelAr: 'تشغيل المزامنة', labelEn: 'Trigger sync' },
  { key: 'act_tickets', group: 'ops', labelAr: 'إجراءات على التذاكر (إسناد/تعليق/نقل)', labelEn: 'Act on tickets (assign/comment/transition)' },
  { key: 'manage_exceptions', group: 'ops', labelAr: 'متابعة الاستثناءات (إقرار/تأجيل/مالك)', labelEn: 'Manage exceptions (ack/snooze/owner)' },
  { key: 'manage_users', group: 'admin', labelAr: 'إدارة المستخدمين', labelEn: 'Manage users' },
  { key: 'manage_roles', group: 'admin', labelAr: 'إدارة الأدوار والصلاحيات', labelEn: 'Manage roles & permissions' },
  { key: 'manage_settings', group: 'admin', labelAr: 'إدارة الإعدادات', labelEn: 'Manage settings' },
  { key: 'manage_branding', group: 'admin', labelAr: 'إدارة الهوية (شعار/خلفية/أيقونة)', labelEn: 'Manage branding' },
  { key: 'manage_integration', group: 'admin', labelAr: 'إدارة الربط بجيرا', labelEn: 'Manage Jira integration' },
  { key: 'manage_companies', group: 'admin', labelAr: 'إدارة الشركات والمشاريع وإسناد المستخدمين', labelEn: 'Manage companies, projects & user assignment' },
  { key: 'view_audit', group: 'security', labelAr: 'عرض سجلّات الدخول والتدقيق', labelEn: 'View login & audit logs' },
  { key: 'view_dependency_log', group: 'security', labelAr: 'عرض سجلّ الاعتماديات المُلغاة', labelEn: 'View cancelled-dependency log' },
  { key: 'reset_2fa', group: 'security', labelAr: 'إعادة ضبط التحقق الثنائي', labelEn: 'Reset 2FA' },
  { key: 'use_offline', group: 'advanced', labelAr: 'العمل دون اتصال (تخزين البيانات على الجهاز)', labelEn: 'Offline mode (cache data on device)' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// صلاحيات إدارية حسّاسة (الوصول لمنطقة الإدارة)
export const ADMIN_PERMISSIONS = ['manage_users', 'manage_roles', 'manage_settings', 'manage_branding', 'manage_integration', 'manage_companies', 'view_audit', 'reset_2fa'];

export function hasPermission(userPerms, key) {
  return Array.isArray(userPerms) && userPerms.includes(key);
}
