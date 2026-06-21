import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { query } from './db.js';

// تخزين صور الملف الشخصي كملفات في uploads/avatars/، والـ mime في users.avatar_mime.
// الملفات تبقى خارج git (مثل أصول الهوية).
const DIR = path.join(process.cwd(), 'uploads', 'avatars');

export async function saveAvatar(userId, buffer, mime) {
  await mkdir(DIR, { recursive: true });
  await writeFile(path.join(DIR, `u_${userId}`), buffer);
  await query('UPDATE users SET avatar_mime = :m WHERE id = :id', { m: mime, id: userId });
}

export async function readAvatar(userId) {
  const rows = await query('SELECT avatar_mime FROM users WHERE id = :id', { id: userId });
  const mime = rows[0]?.avatar_mime;
  if (!mime) return null;
  try {
    const data = await readFile(path.join(DIR, `u_${userId}`));
    return { data, mime };
  } catch {
    return null;
  }
}

export async function removeAvatar(userId) {
  await query('UPDATE users SET avatar_mime = NULL WHERE id = :id', { id: userId });
  try { await unlink(path.join(DIR, `u_${userId}`)); } catch { /* غير موجود */ }
}
