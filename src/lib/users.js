import { query, withTransaction } from './db.js';
import { hashPassword } from './auth.js';
import { PERMISSION_KEYS } from './permissions.js';

// طبقة الوصول للمستخدمين والأدوار والصلاحيات.

export async function listUsers() {
  const users = await query(
    `SELECT id, username, email, full_name, is_active, totp_enabled, created_at
     FROM users ORDER BY username ASC`
  );
  const roleRows = await query(
    `SELECT ur.user_id, r.id AS role_id, r.name
     FROM user_roles ur JOIN roles r ON r.id = ur.role_id`
  );
  const byUser = new Map();
  for (const r of roleRows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, []);
    byUser.get(r.user_id).push({ id: r.role_id, name: r.name });
  }
  return users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.full_name,
    isActive: !!u.is_active,
    totpEnabled: !!u.totp_enabled,
    createdAt: u.created_at,
    roles: byUser.get(u.id) || [],
  }));
}

export async function createUser({ username, email, fullName, password, roleIds = [] }) {
  if (!username || !password) throw new Error('اسم المستخدم وكلمة المرور مطلوبان');
  const hash = await hashPassword(password);
  return withTransaction(async (conn) => {
    const [res] = await conn.execute(
      `INSERT INTO users (username, email, full_name, password_hash)
       VALUES (:username, :email, :fullName, :hash)`,
      { username, email: email || null, fullName: fullName || null, hash }
    );
    const userId = res.insertId;
    for (const rid of roleIds) {
      await conn.execute(
        'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (:u, :r)',
        { u: userId, r: rid }
      );
    }
    return { id: userId };
  });
}

export async function updateUser(id, { email, fullName, isActive, roleIds, password }) {
  await withTransaction(async (conn) => {
    if (email !== undefined || fullName !== undefined || isActive !== undefined) {
      await conn.execute(
        `UPDATE users SET
           email = COALESCE(:email, email),
           full_name = COALESCE(:fullName, full_name),
           is_active = COALESCE(:isActive, is_active)
         WHERE id = :id`,
        {
          email: email ?? null,
          fullName: fullName ?? null,
          isActive: isActive === undefined ? null : isActive ? 1 : 0,
          id,
        }
      );
    }
    if (password) {
      const hash = await hashPassword(password);
      await conn.execute('UPDATE users SET password_hash = :h WHERE id = :id', { h: hash, id });
    }
    if (Array.isArray(roleIds)) {
      await conn.execute('DELETE FROM user_roles WHERE user_id = :id', { id });
      for (const rid of roleIds) {
        await conn.execute(
          'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (:u, :r)',
          { u: id, r: rid }
        );
      }
    }
  });
}

export async function deleteUser(id) {
  await query('DELETE FROM users WHERE id = :id', { id });
}

// إعادة ضبط 2FA لمستخدم (للمدير فقط) — يعطّله ويمسح السرّ
export async function resetUser2fa(id) {
  await query('UPDATE users SET totp_enabled = 0, totp_secret = NULL WHERE id = :id', { id });
}

// ---- الأدوار ----
export async function listRoles() {
  const roles = await query('SELECT id, name, description, is_system FROM roles ORDER BY name ASC');
  const perms = await query('SELECT role_id, permission_key FROM role_permissions');
  const byRole = new Map();
  for (const p of perms) {
    if (!byRole.has(p.role_id)) byRole.set(p.role_id, []);
    byRole.get(p.role_id).push(p.permission_key);
  }
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: !!r.is_system,
    permissions: byRole.get(r.id) || [],
  }));
}

export async function createRole({ name, description, permissions = [] }) {
  if (!name) throw new Error('اسم الدور مطلوب');
  const valid = permissions.filter((p) => PERMISSION_KEYS.includes(p));
  return withTransaction(async (conn) => {
    const [res] = await conn.execute(
      'INSERT INTO roles (name, description) VALUES (:name, :description)',
      { name, description: description || null }
    );
    const roleId = res.insertId;
    for (const key of valid) {
      await conn.execute(
        'INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (:r, :k)',
        { r: roleId, k: key }
      );
    }
    return { id: roleId };
  });
}

export async function updateRole(id, { name, description, permissions }) {
  await withTransaction(async (conn) => {
    if (name !== undefined || description !== undefined) {
      await conn.execute(
        `UPDATE roles SET name = COALESCE(:name, name),
           description = COALESCE(:description, description) WHERE id = :id`,
        { name: name ?? null, description: description ?? null, id }
      );
    }
    if (Array.isArray(permissions)) {
      const valid = permissions.filter((p) => PERMISSION_KEYS.includes(p));
      await conn.execute('DELETE FROM role_permissions WHERE role_id = :id', { id });
      for (const key of valid) {
        await conn.execute(
          'INSERT IGNORE INTO role_permissions (role_id, permission_key) VALUES (:r, :k)',
          { r: id, k: key }
        );
      }
    }
  });
}

export async function deleteRole(id) {
  const rows = await query('SELECT is_system FROM roles WHERE id = :id', { id });
  if (rows[0]?.is_system) throw new Error('لا يمكن حذف دور النظام');
  await query('DELETE FROM roles WHERE id = :id', { id });
}
