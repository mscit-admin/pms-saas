// إدارة حسابات المشرفين الأعلين وصلاحياتهم (مستوى المنصّة).
import bcrypt from 'bcryptjs';
import { controlQuery, controlWithTransaction } from './control-db.js';

// كتالوج صلاحيات المشرف الأعلى (مفتاح: وصف عربي/إنجليزي).
export const CONTROL_PERMISSIONS = [
  { key: 'view_dashboard', ar: 'عرض لوحة المعلومات', en: 'View dashboard' },
  { key: 'manage_tenants', ar: 'إدارة المستأجرين (العملاء)', en: 'Manage tenants (clients)' },
  { key: 'manage_admins', ar: 'إدارة المشرفين', en: 'Manage admins' },
  { key: 'manage_branding', ar: 'الهوية البصرية للمنصّة', en: 'Platform branding' },
];
export const CONTROL_PERMISSION_KEYS = CONTROL_PERMISSIONS.map((p) => p.key);

export async function listAdmins() {
  const rows = await controlQuery(
    `SELECT a.id, a.username, a.full_name AS fullName, a.is_active AS isActive, a.created_at AS createdAt
       FROM control_admins a ORDER BY a.id`
  );
  const perms = await controlQuery('SELECT admin_id AS id, permission_key AS k FROM control_admin_permissions');
  const byId = new Map();
  for (const p of perms) { if (!byId.has(p.id)) byId.set(p.id, []); byId.get(p.id).push(p.k); }
  return rows.map((r) => ({ ...r, isActive: !!r.isActive, permissions: byId.get(r.id) || [] }));
}

export async function getAdminPermissions(adminId) {
  const rows = await controlQuery(
    'SELECT permission_key AS k FROM control_admin_permissions WHERE admin_id = :id',
    { id: adminId }
  );
  return rows.map((r) => r.k);
}

// إنشاء مشرف بصلاحيات محدّدة (idempotent على اسم المستخدم).
export async function createAdmin({ username, password, fullName = null, permissions = [] }) {
  if (!username || !password) throw new Error('اسم المستخدم وكلمة المرور مطلوبان');
  const hash = await bcrypt.hash(password, 10);
  return controlWithTransaction(async (conn) => {
    await conn.execute(
      `INSERT INTO control_admins (username, full_name, password_hash)
       VALUES (:u, :f, :h)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
      { u: username, f: fullName, h: hash }
    );
    const [[a]] = await conn.query('SELECT id FROM control_admins WHERE username = :u', { u: username });
    await conn.execute('DELETE FROM control_admin_permissions WHERE admin_id = :id', { id: a.id });
    for (const k of permissions) {
      await conn.execute(
        'INSERT IGNORE INTO control_admin_permissions (admin_id, permission_key) VALUES (:id, :k)',
        { id: a.id, k }
      );
    }
    return { id: a.id, username };
  });
}

// تحديث صلاحيات/تفعيل/كلمة مرور مشرف قائم.
export async function updateAdmin(id, patch = {}) {
  if (patch.isActive !== undefined) {
    await controlQuery('UPDATE control_admins SET is_active = :a WHERE id = :id', { a: patch.isActive ? 1 : 0, id });
  }
  if (patch.password) {
    const hash = await bcrypt.hash(patch.password, 10);
    await controlQuery('UPDATE control_admins SET password_hash = :h WHERE id = :id', { h: hash, id });
  }
  if (Array.isArray(patch.permissions)) {
    await controlWithTransaction(async (conn) => {
      await conn.execute('DELETE FROM control_admin_permissions WHERE admin_id = :id', { id });
      for (const k of patch.permissions) {
        await conn.execute('INSERT IGNORE INTO control_admin_permissions (admin_id, permission_key) VALUES (:id, :k)', { id, k });
      }
    });
  }
  return true;
}

export async function deleteAdmin(id) {
  await controlQuery('DELETE FROM control_admins WHERE id = :id', { id });
  return true;
}
