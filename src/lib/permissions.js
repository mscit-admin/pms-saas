// كتالوج الصلاحيات — مفاتيح ثابتة في الكود، والأدوار تمنح أيّاً منها.
// (لا يستورد أي شيء خاص بـ Node كي يصلح في middleware على edge.)

export const PERMISSIONS = [
  { key: 'view_operational', labelAr: 'عرض التبويب التشغيلي', labelEn: 'View operational tab' },
  { key: 'view_managerial', labelAr: 'عرض التبويب الإداري', labelEn: 'View managerial tab' },
  { key: 'manage_sla', labelAr: 'ضبط SLA', labelEn: 'Manage SLA' },
  { key: 'trigger_sync', labelAr: 'تشغيل المزامنة', labelEn: 'Trigger sync' },
  { key: 'act_tickets', labelAr: 'إجراءات على التذاكر (إسناد/تعليق/نقل)', labelEn: 'Act on tickets (assign/comment/transition)' },
  { key: 'manage_users', labelAr: 'إدارة المستخدمين', labelEn: 'Manage users' },
  { key: 'manage_roles', labelAr: 'إدارة الأدوار والصلاحيات', labelEn: 'Manage roles & permissions' },
  { key: 'manage_settings', labelAr: 'إدارة الإعدادات', labelEn: 'Manage settings' },
  { key: 'reset_2fa', labelAr: 'إعادة ضبط التحقق الثنائي', labelEn: 'Reset 2FA' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// صلاحيات إدارية حسّاسة (الوصول لمنطقة الإدارة)
export const ADMIN_PERMISSIONS = ['manage_users', 'manage_roles', 'manage_settings', 'reset_2fa'];

export function hasPermission(userPerms, key) {
  return Array.isArray(userPerms) && userPerms.includes(key);
}
